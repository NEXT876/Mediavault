"""Tests for editing and deleting configs in the config dialogs."""

import os

import pytest

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

from PyQt6.QtWidgets import QApplication, QMessageBox  # noqa: E402

from mediavault.gui import dialogs  # noqa: E402
from mediavault.gui.dialogs import ConfigDialog, EditConfigDialog  # noqa: E402
from mediavault.models import MODE_AI, MODE_NORMAL, VaultConfig  # noqa: E402


@pytest.fixture(scope="module")
def app():
    return QApplication.instance() or QApplication([])


@pytest.fixture
def saved(monkeypatch):
    """Record save_configs calls instead of writing the real configs file."""
    calls = []
    monkeypatch.setattr(
        dialogs,
        "save_configs",
        lambda configs, last: calls.append((list(configs), last)),
    )
    monkeypatch.setattr(dialogs.QMessageBox, "warning", lambda *_args: None)
    return calls


def _configs(tmp_path):
    return [
        VaultConfig("Aktiv", MODE_NORMAL, str(tmp_path / "a.json")),
        VaultConfig("Alt", MODE_NORMAL, str(tmp_path / "b.json"), folder="X"),
    ]


def test_edit_changes_name_mode_and_folder(app, saved, tmp_path):
    config = _configs(tmp_path)[1]
    config.folder_last_sync = "gestern"
    dlg = EditConfigDialog(None, config, [config])
    dlg.inp_name.setText("  Neu  ")
    dlg.combo_mode.setCurrentIndex(dlg.combo_mode.findData(MODE_AI))
    dlg.inp_folder.setText(str(tmp_path))
    dlg._save()
    assert (config.name, config.mode, config.folder) == ("Neu", MODE_AI, str(tmp_path))
    assert config.folder_last_sync == ""
    assert config.db_path == str(tmp_path / "b.json")


def test_edit_rejects_a_taken_name_and_a_missing_folder(app, saved, tmp_path):
    configs = _configs(tmp_path)
    dlg = EditConfigDialog(None, configs[1], configs)
    dlg.inp_name.setText("aktiv")
    dlg._save()
    assert configs[1].name == "Alt"
    dlg.inp_name.setText("Alt")
    dlg.inp_folder.setText(str(tmp_path / "fehlt"))
    dlg._save()
    assert configs[1].folder == "X"


def test_delete_removes_only_inactive_configs(app, saved, tmp_path, monkeypatch):
    configs = _configs(tmp_path)
    monkeypatch.setattr(
        dialogs.QMessageBox,
        "question",
        lambda *_args: QMessageBox.StandardButton.Yes,
    )
    dlg = ConfigDialog(None, configs, configs[0].db_path)

    dlg.list_configs.setCurrentRow(0)
    dlg._delete_selected()
    assert len(dlg.configs) == 2 and not dlg.changed

    dlg.list_configs.setCurrentRow(1)
    dlg._delete_selected()
    assert [c.name for c in dlg.configs] == ["Aktiv"]
    assert dlg.list_configs.count() == 1 and dlg.changed
    assert saved[-1] == ([configs[0]], configs[0].db_path)
