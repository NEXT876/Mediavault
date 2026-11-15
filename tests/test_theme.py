import os

import pytest
from PyQt6.QtCore import QSettings
from PyQt6.QtGui import QColor

from mediavault.gui.theme import (
    PALETTES,
    THEME_LABELS,
    ThemeManager,
    build_qpalette,
    build_stylesheet,
)

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")


@pytest.fixture(scope="module")
def app():
    from PyQt6.QtWidgets import QApplication

    return QApplication.instance() or QApplication([])


@pytest.mark.parametrize("name", list(PALETTES))
def test_every_theme_fills_the_stylesheet(app, name):
    assert set(PALETTES[name]) == set(PALETTES["dark"])
    assert "$" not in build_stylesheet(name)
    build_qpalette(name)
    # The wheel and the splash paint these with QColor, so no gradients here.
    for key in ("bg", "surface", "border_strong", "text", "text_muted", "primary"):
        assert QColor(PALETTES[name][key]).isValid(), (name, key)


def test_toggle_cycles_through_all_themes(app, tmp_path):
    settings = QSettings(str(tmp_path / "s.ini"), QSettings.Format.IniFormat)
    manager = ThemeManager(settings)

    seen = [manager.name]
    for _ in THEME_LABELS:
        seen.append(manager.toggle(app))

    assert seen == ["dark", "light", "neon", "dark"]
    assert settings.value("appearance/theme") == "dark"
