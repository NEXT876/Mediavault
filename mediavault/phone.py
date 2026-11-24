"""Data exchange with the phone viewer through a folder inside the library.

The PC writes ``_MediaVault/phone.json`` (scores, groups, wheel lists); the
phone writes small files into ``_MediaVault/changes/`` (ratings, views) which
are applied here. The folder name has no leading dot because MEGA's desktop
sync skips dot-names by default. The event rules are the same on the phone
(``mobile/``), so both sides compute identical scores.
"""

import json
import logging
import math
import os
import time
from collections.abc import Mapping
from contextlib import suppress
from typing import Any

from mediavault import volumes
from mediavault.database import MediaDatabase
from mediavault.jsonio import write_json_atomic
from mediavault.models import LibraryRoot, MediaItem, MediaType

logger = logging.getLogger(__name__)

DATA_DIR = "_MediaVault"
EXPORT_NAME = "phone.json"
CHANGES_DIR = "changes"
MAX_APPLIED = 500
_RATE_DELTA = {1: -10, 2: -5, 3: 0, 4: 5, 5: 10}
# Change files applied in memory whose export failed, by database path. Without
# it a failed write would apply the same file again on the next sync.
_pending: dict[str, list[str]] = {}


def _relative(entry: MediaItem, location: LibraryRoot) -> str | None:
    """Return the entry's file path relative to the library folder, or None.

    None means the file is not inside the folder (or has no usable path).
    """
    path = volumes.absolute_path(entry.file_path, location.volume)
    if not path:
        return None
    try:
        rel = os.path.relpath(path, location.folder)
    except ValueError:  # different drive on Windows
        return None
    rel = rel.replace(os.sep, "/")
    return None if rel == ".." or rel.startswith("../") else rel


def _read_events(path: str) -> list[dict[str, Any]]:
    """Read and validate one change file.

    Raises:
        OSError: When the file cannot be read.
        ValueError: When it is not valid JSON or has the wrong shape.
    """
    with open(path, encoding="utf-8") as f:
        events = json.load(f)["events"]
    if not isinstance(events, list):
        raise ValueError("events is not a list")
    for event in events:
        kind, value, at = event["kind"], event.get("value"), event["at"]
        valid = (
            isinstance(event["path"], str)
            and type(at) in (int, float)
            and math.isfinite(at)
            and (
                kind == "view"
                or (kind == "rate" and type(value) is int and 1 <= value <= 5)
                or (kind == "set" and type(value) is int and 1 <= value <= 100)
            )
        )
        if not valid:
            raise ValueError(f"bad event {event!r}")
    return events


def _apply(entry: MediaItem, event: dict[str, Any]) -> None:
    """Apply one event to an entry; see the rules in the module docstring."""
    kind, at = event["kind"], event["at"]
    if kind == "set":
        entry.score = min(100, max(1, event["value"]))
        return
    if kind == "rate":
        entry.score = min(100, max(1, entry.score + _RATE_DELTA.get(event["value"], 0)))
        entry.rating_count += 1
    entry.watched_counter += 1
    entry.last_watched = max(entry.last_watched, at)


def apply_changes(
    db: MediaDatabase, location: LibraryRoot, applied: list[str]
) -> list[str]:
    """Apply the phone's change files that are not in ``applied`` yet.

    Events of all new files are applied together, oldest first. Files that are
    unreadable or malformed are renamed to ``<name>.bad`` and skipped.

    Args:
        db: Database whose entries are changed (not saved here).
        location: Library the phone data folder lives in.
        applied: Names of change files that were applied before.

    Returns:
        Names of the change files that were applied now.
    """
    changes = os.path.join(location.folder, DATA_DIR, CHANGES_DIR)
    try:
        names = sorted(n for n in os.listdir(changes) if n.endswith(".json"))
    except OSError:
        return []
    done, events = [], []
    for name in names:
        if name in applied:
            continue
        path = os.path.join(changes, name)
        try:
            events += _read_events(path)
        except (OSError, ValueError, KeyError, TypeError) as exc:
            logger.warning("Bad phone change file %s: %s", path, exc)
            try:
                os.replace(path, path + ".bad")
            except OSError:
                logger.warning("Could not rename %s", path, exc_info=True)
            continue
        done.append(name)
    entries = {}
    for entry in db.snapshot():
        rel = _relative(entry, location)
        if rel is not None:
            entries.setdefault(rel.lower(), entry)
    for event in sorted(events, key=lambda e: e["at"]):
        entry = entries.get(event["path"].lower())
        if entry is None:
            logger.info("Phone change for unknown path dropped: %s", event["path"])
        else:
            _apply(entry, event)
    return done


def write_export(
    db: MediaDatabase,
    location: LibraryRoot,
    theme: str,
    wheel: Mapping[str, list[str]],
    applied: list[str],
) -> None:
    """Write ``_MediaVault/phone.json`` for the phone viewer.

    Args:
        db: Database to export; entries outside the library folder are left out.
        location: Library folder to write into.
        theme: Name of the active theme.
        wheel: Saved wheel lists by name.
        applied: Names of applied change files; the last :data:`MAX_APPLIED`
            are kept.

    Raises:
        OSError: When the file cannot be written.
    """
    items = {}
    for entry in db.snapshot():
        rel = _relative(entry, location)
        if rel is not None:
            items[rel] = {
                "title": entry.title,
                "type": "video" if entry.entry_type == MediaType.VIDEO else "image",
                "score": entry.score,
                "group": entry.group,
                "watched": entry.watched_counter,
                "last_watched": entry.last_watched,
                "ratings": entry.rating_count,
            }
    data_dir = os.path.join(location.folder, DATA_DIR)
    os.makedirs(data_dir, exist_ok=True)
    write_json_atomic(
        os.path.join(data_dir, EXPORT_NAME),
        {
            "version": 1,
            "generated": time.time(),
            "theme": theme,
            "groups": db.get_all_groups(),
            "wheel": dict(wheel),
            "applied": applied[-MAX_APPLIED:],
            "items": items,
        },
    )


def sync(
    db: MediaDatabase,
    location: LibraryRoot,
    theme: str,
    wheel: Mapping[str, list[str]],
) -> int:
    """Import the phone's changes and refresh the export.

    The order is save database, write export, delete change files. A failed
    write keeps the applied names in memory, so the next sync does not apply
    them twice; only a hard crash between save and export can still do that.
    Never raises: the app must start even when the folder is unwritable.

    Returns:
        Number of change files applied; 0 for an unavailable location, a
        read-only database or a failed write.
    """
    if db.read_only or not location.available or not os.path.isdir(location.folder):
        return 0
    export = os.path.join(location.folder, DATA_DIR, EXPORT_NAME)
    changes = os.path.join(location.folder, DATA_DIR, CHANGES_DIR)
    try:
        applied, broken = [], False
        if os.path.exists(export):
            try:
                with open(export, encoding="utf-8") as f:
                    applied = [n for n in json.load(f)["applied"] if isinstance(n, str)]
            except (OSError, ValueError, KeyError, TypeError):
                logger.warning("Unreadable phone export %s, rewriting it", export)
                broken = True
        pending = _pending.setdefault(db.filepath, [])
        new = [] if broken else apply_changes(db, location, applied + pending)
        pending += new
        if pending:
            db.save()
        write_export(db, location, theme, wheel, applied + pending)
        done, pending[:] = list(pending), []
        # Also files that came back after being applied (e.g. a MEGA re-sync).
        for name in applied + done:
            with suppress(OSError):
                os.remove(os.path.join(changes, name))
    except Exception:
        logger.warning("Phone sync failed", exc_info=True)
        return 0
    return len(done)
