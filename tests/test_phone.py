import json
import os

import pytest

from mediavault import phone
from mediavault.database import MediaDatabase
from mediavault.models import LibraryRoot, MediaItem, MediaType


def make_library(tmp_path, *entries):
    folder = tmp_path / "lib"
    folder.mkdir(exist_ok=True)
    db = MediaDatabase(str(tmp_path / "m.json"))
    db.entries = list(entries)
    return db, LibraryRoot(folder=str(folder))


def write_change(location, name, events):
    changes = os.path.join(location.folder, phone.DATA_DIR, phone.CHANGES_DIR)
    os.makedirs(changes, exist_ok=True)
    with open(os.path.join(changes, name), "w", encoding="utf-8") as f:
        json.dump({"version": 1, "events": events}, f)


def read_export(location):
    path = os.path.join(location.folder, phone.DATA_DIR, phone.EXPORT_NAME)
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def ev(path, kind, at, value=None):
    event = {"path": path, "kind": kind, "at": at}
    if value is not None:
        event["value"] = value
    return event


def test_export_format_local(tmp_path):
    folder = str(tmp_path / "lib")
    img = MediaItem(
        "Cat",
        image_path=f"{folder}/sub/cat.jpg",
        score=70,
        group="Pets",
        watched_counter=2,
        last_watched=5.5,
        rating_count=3,
    )
    vid = MediaItem(
        "Clip",
        entry_type=MediaType.VIDEO,
        video_link=f"{folder}/clip.mp4",
        image_path=f"{folder}/clip.jpg",
        group="A",
    )
    outside = MediaItem("Out", image_path=str(tmp_path / "other" / "x.jpg"))
    db, loc = make_library(tmp_path, img, vid, outside)

    phone.write_export(db, loc, "neon", {"Wheel": ["a", "b"]}, ["x.json"])

    data = read_export(loc)
    assert data["version"] == 1
    assert isinstance(data["generated"], float)
    assert data["theme"] == "neon"
    assert data["groups"] == ["A", "Pets"]
    assert data["wheel"] == {"Wheel": ["a", "b"]}
    assert data["applied"] == ["x.json"]
    assert data["items"] == {
        "sub/cat.jpg": {
            "title": "Cat",
            "type": "image",
            "score": 70,
            "group": "Pets",
            "watched": 2,
            "last_watched": 5.5,
            "ratings": 3,
        },
        "clip.mp4": {
            "title": "Clip",
            "type": "video",
            "score": 50,
            "group": "A",
            "watched": 0,
            "last_watched": 0.0,
            "ratings": 0,
        },
    }


def test_export_stick_relative_paths(tmp_path):
    volume = tmp_path / "stick"
    (volume / "media").mkdir(parents=True)
    item = MediaItem("Cat", image_path="media/a/cat.jpg")
    db = MediaDatabase(str(tmp_path / "m.json"))
    db.entries = [item]
    loc = LibraryRoot(volume=str(volume), folder=str(volume / "media"))

    phone.write_export(db, loc, "dark", {}, [])

    assert list(read_export(loc)["items"]) == ["a/cat.jpg"]


def test_export_keeps_last_applied_only(tmp_path):
    db, loc = make_library(tmp_path)
    names = [f"{i}.json" for i in range(phone.MAX_APPLIED + 3)]

    phone.write_export(db, loc, "dark", {}, names)

    assert read_export(loc)["applied"] == names[-phone.MAX_APPLIED :]


def test_rate_set_view_rules(tmp_path):
    folder = str(tmp_path / "lib")
    a = MediaItem("A", image_path=f"{folder}/a.jpg", score=95, last_watched=100.0)
    b = MediaItem("B", image_path=f"{folder}/b.jpg", score=5)
    c = MediaItem("C", image_path=f"{folder}/c.jpg", score=50)
    db, loc = make_library(tmp_path, a, b, c)
    write_change(
        loc,
        "1-aaaaaaaa.json",
        [
            ev("a.jpg", "rate", 10.0, 5),
            ev("b.jpg", "rate", 10.0, 1),
            ev("c.jpg", "set", 10.0, 100),
            ev("c.jpg", "view", 20.0),
        ],
    )

    assert phone.apply_changes(db, loc, []) == ["1-aaaaaaaa.json"]

    assert (a.score, a.watched_counter, a.rating_count, a.last_watched) == (
        100,
        1,
        1,
        100.0,
    )
    assert (b.score, b.watched_counter, b.rating_count, b.last_watched) == (
        1,
        1,
        1,
        10.0,
    )
    assert (c.score, c.watched_counter, c.rating_count, c.last_watched) == (
        100,
        1,
        0,
        20.0,
    )


def test_rate_deltas(tmp_path):
    folder = str(tmp_path / "lib")
    item = MediaItem("A", image_path=f"{folder}/a.jpg", score=50)
    db, loc = make_library(tmp_path, item)
    write_change(
        loc,
        "1-aaaaaaaa.json",
        [
            ev("a.jpg", "rate", 1.0, 4),  # +5
            ev("a.jpg", "rate", 2.0, 3),  # 0
            ev("a.jpg", "rate", 3.0, 2),  # -5
            ev("a.jpg", "rate", 4.0, 1),  # -10
        ],
    )

    phone.apply_changes(db, loc, [])

    assert item.score == 40
    assert item.rating_count == 4


def test_events_of_two_files_apply_in_at_order(tmp_path):
    folder = str(tmp_path / "lib")
    item = MediaItem("A", image_path=f"{folder}/a.jpg", score=50)
    db, loc = make_library(tmp_path, item)
    # The later file holds the earlier event: set must win because it is newest.
    write_change(loc, "1-aaaaaaaa.json", [ev("a.jpg", "set", 20.0, 80)])
    write_change(loc, "2-bbbbbbbb.json", [ev("a.jpg", "rate", 10.0, 5)])

    applied = phone.apply_changes(db, loc, [])

    assert applied == ["1-aaaaaaaa.json", "2-bbbbbbbb.json"]
    assert item.score == 80


def test_case_insensitive_and_unknown_paths(tmp_path):
    folder = str(tmp_path / "lib")
    item = MediaItem("A", image_path=f"{folder}/Sub/A.JPG", score=50)
    db, loc = make_library(tmp_path, item)
    write_change(
        loc,
        "1-aaaaaaaa.json",
        [
            ev("sub/a.jpg", "set", 1.0, 70),
            ev("missing.jpg", "set", 2.0, 10),
        ],
    )

    assert phone.apply_changes(db, loc, []) == ["1-aaaaaaaa.json"]
    assert item.score == 70


def test_broken_change_file_is_renamed(tmp_path):
    folder = str(tmp_path / "lib")
    item = MediaItem("A", image_path=f"{folder}/a.jpg", score=50)
    db, loc = make_library(tmp_path, item)
    changes = tmp_path / "lib" / phone.DATA_DIR / phone.CHANGES_DIR
    write_change(loc, "2-bbbbbbbb.json", [ev("a.jpg", "set", 1.0, 60)])
    (changes / "1-aaaaaaaa.json").write_text("{not json", encoding="utf-8")
    (changes / "3-cccccccc.json").write_text('{"events": 5}', encoding="utf-8")

    assert phone.apply_changes(db, loc, []) == ["2-bbbbbbbb.json"]

    assert item.score == 60
    assert (changes / "1-aaaaaaaa.json.bad").exists()
    assert (changes / "3-cccccccc.json.bad").exists()
    assert not (changes / "1-aaaaaaaa.json").exists()


def test_sync_saves_exports_and_deletes_once(tmp_path):
    folder = str(tmp_path / "lib")
    item = MediaItem("A", image_path=f"{folder}/a.jpg", score=50)
    db, loc = make_library(tmp_path, item)
    write_change(loc, "1-aaaaaaaa.json", [ev("a.jpg", "set", 1.0, 70)])
    change = tmp_path / "lib" / phone.DATA_DIR / phone.CHANGES_DIR / "1-aaaaaaaa.json"
    content = change.read_text(encoding="utf-8")

    assert phone.sync(db, loc, "dark", {"W": ["x"]}) == 1

    assert not change.exists()
    assert (
        json.loads((tmp_path / "m.json").read_text(encoding="utf-8"))[0]["score"] == 70
    )
    export = read_export(loc)
    assert export["applied"] == ["1-aaaaaaaa.json"]
    assert export["items"]["a.jpg"]["score"] == 70

    # The phone's upload shows up again (e.g. MEGA re-sync): not applied twice.
    change.write_text(content, encoding="utf-8")
    item.score = 55
    assert phone.sync(db, loc, "dark", {}) == 0
    assert item.score == 55
    assert not change.exists()


def test_sync_unavailable_location_does_nothing(tmp_path):
    db = MediaDatabase(str(tmp_path / "m.json"))

    assert phone.sync(db, LibraryRoot(volume=str(tmp_path)), "dark", {}) == 0
    assert phone.sync(db, LibraryRoot(folder=str(tmp_path / "gone")), "dark", {}) == 0

    assert not (tmp_path / phone.DATA_DIR).exists()
    assert not (tmp_path / "gone").exists()


def test_sync_read_only_db_touches_nothing(tmp_path):
    folder = str(tmp_path / "lib")
    item = MediaItem("A", image_path=f"{folder}/a.jpg", score=50)
    db, loc = make_library(tmp_path, item)
    db.read_only = True
    write_change(loc, "1-aaaaaaaa.json", [ev("a.jpg", "set", 1.0, 70)])
    change = tmp_path / "lib" / phone.DATA_DIR / phone.CHANGES_DIR / "1-aaaaaaaa.json"

    assert phone.sync(db, loc, "dark", {}) == 0

    assert item.score == 50
    assert change.exists()
    assert not (tmp_path / "lib" / phone.DATA_DIR / phone.EXPORT_NAME).exists()


def test_failed_export_does_not_apply_twice(tmp_path, monkeypatch):
    folder = str(tmp_path / "lib")
    item = MediaItem("A", image_path=f"{folder}/a.jpg", score=50)
    db, loc = make_library(tmp_path, item)
    write_change(loc, "1-aaaaaaaa.json", [ev("a.jpg", "rate", 1.0, 5)])
    change = tmp_path / "lib" / phone.DATA_DIR / phone.CHANGES_DIR / "1-aaaaaaaa.json"
    real = phone.write_export
    calls = []

    def flaky(*args):
        calls.append(1)
        if len(calls) == 1:
            raise PermissionError("held by MEGA")
        real(*args)

    monkeypatch.setattr(phone, "write_export", flaky)

    assert phone.sync(db, loc, "dark", {}) == 0
    assert item.score == 60
    assert change.exists()

    assert phone.sync(db, loc, "dark", {}) == 1
    assert item.score == 60
    assert read_export(loc)["applied"] == ["1-aaaaaaaa.json"]
    assert not change.exists()


@pytest.mark.parametrize(
    "event",
    [
        {"path": "a.jpg", "kind": "view", "at": float("inf")},
        {"path": "a.jpg", "kind": "view", "at": True},
        {"path": "a.jpg", "kind": "set", "at": 1.0, "value": True},
        {"path": "a.jpg", "kind": "rate", "at": 1.0, "value": 6},
        {"path": "a.jpg", "kind": "set", "at": 1.0, "value": 0},
        {"path": "a.jpg", "kind": "set", "at": 1.0},
    ],
)
def test_invalid_events_make_the_file_bad(tmp_path, event):
    folder = str(tmp_path / "lib")
    item = MediaItem("A", image_path=f"{folder}/a.jpg", score=50)
    db, loc = make_library(tmp_path, item)
    write_change(loc, "1-aaaaaaaa.json", [event])

    assert phone.apply_changes(db, loc, []) == []

    assert item.score == 50
    changes = tmp_path / "lib" / phone.DATA_DIR / phone.CHANGES_DIR
    assert (changes / "1-aaaaaaaa.json.bad").exists()


def test_broken_export_applies_nothing_and_is_rewritten(tmp_path):
    folder = str(tmp_path / "lib")
    item = MediaItem("A", image_path=f"{folder}/a.jpg", score=50)
    db, loc = make_library(tmp_path, item)
    write_change(loc, "1-aaaaaaaa.json", [ev("a.jpg", "set", 1.0, 70)])
    export = tmp_path / "lib" / phone.DATA_DIR / phone.EXPORT_NAME
    export.write_text("{broken", encoding="utf-8")

    assert phone.sync(db, loc, "dark", {}) == 0

    assert item.score == 50
    assert read_export(loc)["applied"] == []
    assert phone.sync(db, loc, "dark", {}) == 1
    assert item.score == 70


def test_sync_never_raises(tmp_path, monkeypatch):
    db, loc = make_library(tmp_path)

    def boom(*args):
        raise RuntimeError("boom")

    monkeypatch.setattr(phone, "apply_changes", boom)

    assert phone.sync(db, loc, "dark", {}) == 0
