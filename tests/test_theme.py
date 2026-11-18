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


def test_neon_cards_glow_only_when_selected_or_hovered(app, tmp_path):
    from PyQt6.QtWidgets import QGraphicsDropShadowEffect

    from mediavault.gui.widgets import MediaCard
    from mediavault.models import MediaItem

    settings = QSettings(str(tmp_path / "s.ini"), QSettings.Format.IniFormat)
    manager = ThemeManager(settings)
    manager.apply(app, "neon")
    card = MediaCard(MediaItem("A"), None)

    assert card.graphicsEffect() is None
    card.set_selected(True)
    assert isinstance(card.graphicsEffect(), QGraphicsDropShadowEffect)
    card.set_selected(False)
    assert card.graphicsEffect() is None
    card._update_glow(hovered=True)
    assert card.graphicsEffect() is not None

    manager.apply(app, "dark")  # style change: no glow outside neon
    assert card.graphicsEffect() is None


def _contrast(fg, bg):
    """WCAG contrast ratio of two #rrggbb colors."""

    def luminance(color):
        channels = [int(color.lstrip("#")[i : i + 2], 16) / 255 for i in (0, 2, 4)]
        linear = [
            c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
            for c in channels
        ]
        return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]

    high, low = sorted((luminance(fg), luminance(bg)), reverse=True)
    return (high + 0.05) / (low + 0.05)


@pytest.mark.parametrize("name", list(PALETTES))
def test_text_contrast_meets_wcag_aa(name):
    colors = PALETTES[name]
    pairs = [
        ("primary_fill_text", "primary_fill"),
        ("nav_active_text", "nav_active_bg"),
        ("text_muted", "bg"),
        ("text_muted", "surface"),
        ("text", "surface"),
    ]
    # Danger buttons and score badges use white text (see the stylesheet).
    for key in ("danger", "score_high", "score_mid", "score_low", "score_bad"):
        pairs.append(("#ffffff", key))
    for fg, bg in pairs:
        ratio = _contrast(colors.get(fg, fg), colors[bg])
        assert ratio >= 4.5, (name, fg, bg, round(ratio, 2))
