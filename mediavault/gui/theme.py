"""Central themes for the whole user interface.

Dark, light and neon are the real ones; chaos, underworld and heaven are
over-the-top party themes animated by :mod:`mediavault.gui.chaos`.

A theme is a color palette (:data:`PALETTES`) that fills one shared Qt
stylesheet template, plus a matching ``QPalette`` for native dialogs and
popups that ignore stylesheets. Widgets are styled through object names
(e.g. ``MediaCard``, ``HintLabel``) and dynamic properties (``variant`` on
buttons, ``selected`` on cards, ``tier`` on score badges); after changing
such a property call :func:`repolish`.

:class:`ThemeManager` applies a theme at runtime and stores the choice in
``QSettings`` (:data:`ORGANIZATION`/:data:`APPLICATION`), which other
widgets reuse for their own UI state.
"""

from string import Template

from PyQt6.QtCore import QObject, QSettings, pyqtSignal
from PyQt6.QtGui import QColor, QPalette
from PyQt6.QtWidgets import QApplication, QWidget

from mediavault.gui import chaos

ORGANIZATION = "MediaVault"
APPLICATION = "MediaTracker"
SETTINGS_KEY = "appearance/theme"

# Segoe UI on Windows; Linux distros use the first family they have installed.
FONT_FAMILIES = ("Segoe UI", "Noto Sans", "Ubuntu", "Cantarell", "DejaVu Sans")

# QSS-only brush; keys used with QColor (wheel, QPalette, splash) stay plain colors.
_NEON_GRADIENT = (
    "qlineargradient(x1:0, y1:0, x2:1, y2:1, stop:0 %s, stop:0.5 %s, stop:1 %s)"
)

# Names in the order the sidebar button cycles through them, with their labels.
THEME_LABELS = {
    "dark": "Dunkles Theme",
    "light": "Helles Theme",
    "neon": "Neon-Theme",
    "chaos": "CHAOS-Theme",
    "underworld": "Unterwelt-Theme",
    "heaven": "Himmel-Theme",
}

# Type scale: modular scale "major second" (ratio 1.125) on a 16 px body
# (12 pt), at most four sizes. Points follow the OS DPI setting, pixels do not.
TYPE_SCALE = {
    "fs_caption": "10.5pt",  # ms(-1) ~14 px: section labels, hints, badges
    "fs_body": "12pt",  # ms(0) 16 px: everything else
    "fs_heading": "15pt",  # ms(2) ~20 px: dialog titles, wheel result
    "fs_title": "17pt",  # ms(3) ~23 px: app and page title
}

PALETTES: dict[str, dict[str, str]] = {
    "dark": {
        "bg": "#1f2228",
        "surface": "#272b33",
        "surface_alt": "#2e333e",
        "hover": "#363d4b",
        "input_bg": "#252a32",
        "border": "#373e4c",
        "border_strong": "#485163",
        "text": "#e6e8ec",
        "text_muted": "#98a2b3",
        "primary": "#4f8cff",
        "primary_hover": "#6ba0ff",
        "primary_text": "#ffffff",
        "danger": "#c93a3a",
        "danger_hover": "#b83232",
        "selection_bg": "#26344c",
        "selection_fill": "rgba(79, 140, 255, 48)",
        "nav_active_bg": "#2c3b55",
        "nav_active_text": "#8ab4ff",
        "scrollbar": "#454d5c",
        "scrollbar_hover": "#555f72",
        "score_high": "#1e7a52",
        "score_mid": "#8a6d0f",
        "score_low": "#b4501f",
        "score_bad": "#c0392b",
        "accent": "#4f8cff",
        "accent_hover": "#6ba0ff",
        # Darker than primary, so white button text stays readable (4.5:1).
        "primary_fill": "#2f6be0",
        "primary_fill_hover": "#2559c4",
        "primary_fill_text": "#ffffff",
        "glow": "",
    },
    "light": {
        "bg": "#f4f6fa",
        "surface": "#ffffff",
        "surface_alt": "#eef1f6",
        "hover": "#e8ecf2",
        "input_bg": "#ffffff",
        "border": "#d7dde7",
        "border_strong": "#b9c3d3",
        "text": "#1b1f24",
        "text_muted": "#5b6472",
        "primary": "#2563eb",
        "primary_hover": "#1d4ed8",
        "primary_text": "#ffffff",
        "danger": "#d92d20",
        "danger_hover": "#b91c1c",
        "selection_bg": "#e8efff",
        "selection_fill": "rgba(37, 99, 235, 40)",
        "nav_active_bg": "#edf2ff",
        "nav_active_text": "#2563eb",
        "scrollbar": "#c7cfdb",
        "scrollbar_hover": "#aeb9c9",
        "score_high": "#12805c",
        "score_mid": "#b45309",
        "score_low": "#c2410c",
        "score_bad": "#d92d20",
        "accent": "#2563eb",
        "accent_hover": "#1d4ed8",
        "primary_fill": "#2563eb",
        "primary_fill_hover": "#1d4ed8",
        "primary_fill_text": "#ffffff",
        "glow": "",
    },
    # Dark glass with a cyan-violet-pink glow on accents.
    "neon": {
        "bg": "#0b0b12",
        "surface": "#14141d",
        "surface_alt": "#1a1a26",
        "hover": "#232334",
        "input_bg": "#101018",
        "border": "#26263a",
        "border_strong": "#3a3757",
        "text": "#ecebf5",
        "text_muted": "#8b8aa3",
        "primary": "#c084fc",
        "primary_hover": "#e879f9",
        "primary_text": "#0b0b12",
        "danger": "#d42a4a",
        "danger_hover": "#be123c",
        "selection_bg": "#1d1730",
        "selection_fill": "rgba(192, 132, 252, 50)",
        "nav_active_bg": "#221a37",
        "nav_active_text": "#c084fc",
        "scrollbar": "#2c2a44",
        "scrollbar_hover": "#48436e",
        "score_high": "#0d7d70",
        "score_mid": "#7c3aed",
        "score_low": "#db2777",
        "score_bad": "#e11d48",
        "accent": _NEON_GRADIENT % ("#67e8f9", "#a78bfa", "#f472b6"),
        "accent_hover": _NEON_GRADIENT % ("#a5f3fc", "#c4b5fd", "#f9a8d4"),
        "primary_fill": "#1a1528",
        "primary_fill_hover": "#251c3a",
        "primary_fill_text": "#ffffff",
        # Card glow (#AARRGGBB, read by MediaCard); empty means no glow.
        "glow": "#ffb57cff",
    },
    # Everything at once: rainbows, glow, sparkles (see chaos.py). Just for fun.
    "chaos": {
        "bg": "#14002b",
        "surface": "#1f0540",
        "surface_alt": "#2a0a55",
        "hover": "#3d0f7a",
        "input_bg": "#180236",
        "border": "#ff00d4",
        "border_strong": "#00f0ff",
        "text": "#fff6a8",
        "text_muted": "#7dfcff",
        "primary": "#ff00d4",
        "primary_hover": "#ffe600",
        "primary_text": "#14002b",
        "danger": "#d1001f",
        "danger_hover": "#a8001a",
        "selection_bg": "#4a0d6e",
        "selection_fill": "rgba(255, 0, 212, 70)",
        "nav_active_bg": "#3a005c",
        "nav_active_text": "#39ff14",
        "scrollbar": "#ff00d4",
        "scrollbar_hover": "#ffe600",
        "score_high": "#0a7a3a",
        "score_mid": "#8a00c4",
        "score_low": "#c2410c",
        "score_bad": "#d1001f",
        "accent": _NEON_GRADIENT % ("#ff0040", "#ffe600", "#00f0ff"),
        "accent_hover": _NEON_GRADIENT % ("#39ff14", "#ff00d4", "#ffe600"),
        "primary_fill": "#7a00b8",
        "primary_fill_hover": "#9d00e6",
        "primary_fill_text": "#ffffff",
        "glow": "#ffff00d4",
    },
    # CHAOS, but from hell: embers, skulls, fire gradients.
    "underworld": {
        "bg": "#0d0000",
        "surface": "#1a0303",
        "surface_alt": "#260606",
        "hover": "#3d0a0a",
        "input_bg": "#140202",
        "border": "#8b0000",
        "border_strong": "#ff4500",
        "text": "#ffd9b3",
        "text_muted": "#ff9966",
        "primary": "#ff4500",
        "primary_hover": "#ffae00",
        "primary_text": "#0d0000",
        "danger": "#b3001b",
        "danger_hover": "#8a0015",
        "selection_bg": "#3d0a0a",
        "selection_fill": "rgba(255, 69, 0, 60)",
        "nav_active_bg": "#3a0505",
        "nav_active_text": "#ffae00",
        "scrollbar": "#8b0000",
        "scrollbar_hover": "#ff4500",
        "score_high": "#2e6b1f",
        "score_mid": "#9a3d00",
        "score_low": "#b3001b",
        "score_bad": "#7a0000",
        "accent": _NEON_GRADIENT % ("#ff2200", "#ff7b00", "#ffcc00"),
        "accent_hover": _NEON_GRADIENT % ("#ffcc00", "#ff2200", "#8b0000"),
        "primary_fill": "#8b0000",
        "primary_fill_hover": "#a30000",
        "primary_fill_text": "#ffffff",
        "glow": "#ffff4500",
    },
    # CHAOS, but from above: clouds, gold, feathers floating down.
    "heaven": {
        "bg": "#eaf6ff",
        "surface": "#ffffff",
        "surface_alt": "#f3f9ff",
        "hover": "#dcefff",
        "input_bg": "#ffffff",
        "border": "#bfe0ff",
        "border_strong": "#e6c35c",
        "text": "#1d2b4f",
        "text_muted": "#4a5f86",
        "primary": "#3b82c4",
        "primary_hover": "#c9a227",
        "primary_text": "#ffffff",
        "danger": "#c0392b",
        "danger_hover": "#a93226",
        "selection_bg": "#fff6d6",
        "selection_fill": "rgba(255, 215, 0, 60)",
        "nav_active_bg": "#fff4cc",
        "nav_active_text": "#7a5a00",
        "scrollbar": "#bfe0ff",
        "scrollbar_hover": "#e6c35c",
        "score_high": "#12805c",
        "score_mid": "#b45309",
        "score_low": "#c2410c",
        "score_bad": "#d92d20",
        "accent": _NEON_GRADIENT % ("#9fd8ff", "#ffffff", "#e6c35c"),
        "accent_hover": _NEON_GRADIENT % ("#e6c35c", "#ffffff", "#9fd8ff"),
        "primary_fill": "#2563eb",
        "primary_fill_hover": "#1d4ed8",
        "primary_fill_text": "#ffffff",
        "glow": "#ffffd700",
    },
}

def _gradient(colors: tuple[str, ...], vertical: bool = False) -> str:
    """QSS linear gradient through ``colors`` (left→right, or top→bottom)."""
    stops = ", ".join(f"stop:{i / (len(colors) - 1):.2f} {c}" for i, c in enumerate(colors))
    end = "x2:0, y2:1" if vertical else "x2:1, y2:0"
    return f"qlineargradient(x1:0, y1:0, {end}, {stops})"


# Look of the three party themes; their animations live in chaos.FLAVORS.
_PARTY_LOOKS = {
    "chaos": {
        "font": '"Comic Sans MS", "Comic Neue", "Chalkboard SE", cursive',
        "bg": ("#5a0fa0", "#14002b", "#000000"),
        "side": ("#2a0050", "#00244d", "#4d0033"),
        "on": "#14002b", "line": "#ffffff", "hot": "#ffe600",
        "cool": "#00f0ff", "ok": "#39ff14", "edge": "#ff00d4",
    },
    "underworld": {
        "font": '"Chiller", "Creepster", "Papyrus", "Old English Text MT", serif',
        "bg": ("#5c0a00", "#1a0000", "#000000"),
        "side": ("#000000", "#2b0000", "#6b1400"),
        "on": "#1a0000", "line": "#2b0000", "hot": "#ffae00",
        "cool": "#ff4500", "ok": "#ffd000", "edge": "#ff4500",
    },
    "heaven": {
        "font": '"Segoe Script", "Lucida Handwriting", "Brush Script MT", cursive',
        "bg": ("#ffffff", "#e3f3ff", "#bfe0ff"),
        "side": ("#ffffff", "#e8f5ff", "#fff3cc"),
        "on": "#1d2b4f", "line": "#ffffff", "hot": "#e6c35c",
        "cool": "#9fd8ff", "ok": "#d4af37", "edge": "#e6c35c",
    },
}


def _party_extra(name: str) -> str:
    """Extra QSS for a party theme; no font-size here (type scale test)."""
    look = _PARTY_LOOKS[name]
    flow = _gradient(chaos.FLAVORS[name]["colors"])
    ink = _gradient(chaos.FLAVORS[name]["ink"])
    drop = _gradient(chaos.FLAVORS[name]["colors"], vertical=True)
    bg0, bg1, bg2 = look["bg"]
    s0, s1, s2 = look["side"]
    on, line, hot, cool, ok, edge = (look[k] for k in ("on", "line", "hot", "cool", "ok", "edge"))
    return f"""
* {{ font-family: {look["font"]}; }}
QMainWindow, QDialog {{
    background: qradialgradient(cx:0.5, cy:0.4, radius:1.1, fx:0.3, fy:0.2,
        stop:0 {bg0}, stop:0.5 {bg1}, stop:1 {bg2});
}}
QPushButton, QPushButton[variant="primary"], QToolButton {{
    background: {flow};
    color: {on};
    border: 3px dashed {line};
    border-radius: 14px;
    font-weight: 900;
}}
QPushButton:hover, QPushButton[variant="primary"]:hover {{ border: 3px dotted {hot}; }}
QPushButton:pressed {{ padding-top: 9px; border-style: double; }}
QLineEdit, QComboBox, QSpinBox, QTextEdit, QPlainTextEdit {{
    border: 2px dashed {cool};
    border-radius: 12px;
}}
QLineEdit:focus, QComboBox:focus {{ border: 3px solid {ok}; }}
QScrollBar::handle:vertical {{ background: {flow}; border-radius: 6px; }}
QScrollBar::handle:horizontal {{ background: {flow}; border-radius: 6px; }}
QProgressBar::chunk {{ background: {flow}; border-radius: 6px; }}
QToolTip {{
    background: {drop};
    color: {on};
    border: 3px solid {line};
    font-weight: 900;
}}
QCheckBox::indicator:checked {{ background: {ok}; border-radius: 9px; }}
QPushButton[nav="true"]:checked {{
    background: {flow};
    color: {on};
    border: 3px double {line};
}}
QFrame#MediaCard {{
    border: 3px solid {drop};
    border-radius: 22px;
}}
QFrame#MediaCard:hover {{ border: 5px dashed {hot}; }}
QFrame#MediaCard[selected="true"] {{ border: 6px double {ok}; }}
QLabel#CardTitle, QLabel#AppTitle, QLabel#PageTitle, QLabel#DialogTitle {{
    color: {ink};
    font-weight: 900;
}}
QLabel#ScoreBadge {{ border: 2px dotted {line}; border-radius: 10px; }}
QWidget#Sidebar {{
    background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
        stop:0 {s0}, stop:0.5 {s1}, stop:1 {s2});
    border-right: 4px ridge {edge};
}}
QWidget#ActionBar {{ border: 3px groove {cool}; border-radius: 18px; }}
"""


_STYLESHEET = Template(
    """
QMainWindow, QDialog {
    background-color: $bg;
}

QWidget {
    color: $text;
    font-size: $fs_body;
}

QWidget#Sidebar {
    background-color: $surface;
    border-right: 1px solid $border;
}

QLabel#AppTitle { font-size: $fs_title; font-weight: 600; }
QLabel#AppSubtitle { color: $text_muted; font-size: $fs_caption; }
QLabel#SectionLabel { color: $text_muted; font-size: $fs_caption; font-weight: 600; }
QPushButton#SectionToggle {
    background: transparent;
    border: none;
    color: $text_muted;
    font-size: $fs_caption;
    font-weight: 600;
    text-align: left;
    padding: 10px 0 2px 4px;
}
QPushButton#SectionToggle:hover { color: $text; }
QLabel#PageTitle { font-size: $fs_title; font-weight: 600; }
QLabel#DialogTitle { font-size: $fs_heading; font-weight: 600; }
QLabel#MutedLabel, QLabel#CardGroup { color: $text_muted; }
QLabel#FieldLabel { color: $text_muted; font-size: $fs_caption; font-weight: 600; }
QLabel#SelectionCount { font-weight: 600; }
QLabel#HintLabel { color: $text_muted; font-size: $fs_caption; }

QWidget#ActionBar {
    background-color: $surface;
    border: 1px solid $border;
    border-radius: 10px;
}

QPushButton {
    background-color: $surface_alt;
    color: $text;
    border: 1px solid $border;
    border-radius: 8px;
    padding: 7px 13px;
}
QPushButton:hover { background-color: $hover; }
QPushButton:pressed { background-color: $border; }
QPushButton:disabled {
    color: $text_muted;
    background-color: transparent;
    border-color: $border;
}

QPushButton[variant="primary"] {
    background-color: $primary_fill;
    color: $primary_fill_text;
    border: 1px solid $accent;
    font-weight: 600;
}
QPushButton[variant="primary"]:hover {
    background-color: $primary_fill_hover;
    border-color: $accent_hover;
}
QPushButton[variant="primary"]:disabled {
    background-color: $surface_alt;
    border-color: $border;
    color: $text_muted;
}
QPushButton[variant="secondary"] { background-color: transparent; }
QPushButton[variant="danger"] {
    background-color: $danger;
    color: #ffffff;
    border: 1px solid $danger;
    font-weight: 600;
}
QPushButton[variant="danger"]:hover {
    background-color: $danger_hover;
    border-color: $danger_hover;
}
QPushButton[variant="danger"]:disabled {
    background-color: transparent;
    border-color: $border;
    color: $text_muted;
}
QPushButton[variant="ghost"] {
    background-color: transparent;
    border-color: transparent;
}
QPushButton[variant="ghost"]:hover {
    background-color: $hover;
    border-color: $border;
}

QPushButton[nav="true"] {
    text-align: left;
    padding: 9px 12px;
    background-color: transparent;
    border: 1px solid transparent;
    border-radius: 8px;
    color: $text_muted;
    font-weight: 600;
}
QPushButton[nav="true"]:hover { background-color: $hover; color: $text; }
QPushButton[nav="true"]:checked {
    background-color: $nav_active_bg;
    border-color: $nav_active_bg;
    color: $nav_active_text;
}

QLineEdit, QTextEdit, QPlainTextEdit, QComboBox {
    background-color: $input_bg;
    border: 1px solid $border;
    border-radius: 8px;
    padding: 6px 9px;
    selection-background-color: $primary;
    selection-color: $primary_text;
}
QLineEdit:focus, QTextEdit:focus, QPlainTextEdit:focus, QComboBox:focus {
    border-color: $accent;
}
QComboBox { padding-right: 24px; }
QComboBox QAbstractItemView {
    background-color: $surface;
    border: 1px solid $border;
    border-radius: 8px;
    padding: 4px;
    selection-background-color: $nav_active_bg;
    selection-color: $nav_active_text;
    outline: none;
}

QCheckBox { spacing: 8px; background: transparent; }
QCheckBox::indicator {
    width: 16px;
    height: 16px;
    border: 1px solid $border_strong;
    border-radius: 4px;
    background-color: $input_bg;
}
QCheckBox::indicator:hover { border-color: $primary; }
QCheckBox::indicator:checked {
    background-color: $accent;
    border-color: $primary;
}

QScrollArea { border: none; background: transparent; }
QWidget#GridContainer, QWidget#GridViewport { background: transparent; }

QScrollBar:vertical { background: transparent; width: 10px; margin: 2px; }
QScrollBar::handle:vertical {
    background: $scrollbar;
    min-height: 30px;
    border-radius: 5px;
}
QScrollBar::handle:vertical:hover { background: $scrollbar_hover; }
QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical { height: 0; }
QScrollBar::add-page:vertical, QScrollBar::sub-page:vertical { background: transparent; }
QScrollBar:horizontal { background: transparent; height: 10px; margin: 2px; }
QScrollBar::handle:horizontal {
    background: $scrollbar;
    min-width: 30px;
    border-radius: 5px;
}
QScrollBar::handle:horizontal:hover { background: $scrollbar_hover; }
QScrollBar::add-line:horizontal, QScrollBar::sub-line:horizontal { width: 0; }
QScrollBar::add-page:horizontal, QScrollBar::sub-page:horizontal { background: transparent; }

QFrame#MediaCard {
    background-color: $surface;
    border: 2px solid $border;
    border-radius: 12px;
}
QFrame#MediaCard:hover {
    background-color: $surface_alt;
    border-color: $border_strong;
}
QFrame#MediaCard[selected="true"] {
    background-color: $selection_bg;
    border-color: $accent;
}

QLabel#CardImage {
    background-color: $surface_alt;
    border-radius: 8px;
    color: $text_muted;
}
QLabel#CardTitle { background: transparent; font-weight: 600; }
QLabel#SelectionBadge {
    background-color: $accent;
    color: $primary_text;
    border-radius: 11px;
    font-weight: 600;
}
QLabel#ScoreBadge {
    border-radius: 9px;
    padding: 2px 8px;
    font-size: $fs_caption;
    font-weight: 600;
}
QLabel#ScoreBadge[tier="high"] { background-color: $score_high; color: #ffffff; }
QLabel#ScoreBadge[tier="mid"] { background-color: $score_mid; color: #ffffff; }
QLabel#ScoreBadge[tier="low"] { background-color: $score_low; color: #ffffff; }
QLabel#ScoreBadge[tier="bad"] { background-color: $score_bad; color: #ffffff; }

QLabel#DialogImage {
    background-color: $surface_alt;
    border-radius: 10px;
    color: $text_muted;
}

QFrame#DownloadRow {
    background-color: $surface;
    border: 1px solid $border;
    border-radius: 10px;
}
QLabel#DownloadIcon, QLabel#DownloadTitle { background: transparent; }
QLabel#DownloadTitle { font-weight: 600; }
QProgressBar {
    background-color: $surface_alt;
    border: none;
    border-radius: 3px;
}
QProgressBar::chunk { background-color: $accent; border-radius: 3px; }

QFrame#WheelPanel {
    background-color: $surface;
    border: 1px solid $border;
    border-radius: 12px;
}
QFrame#WheelResult {
    background-color: $surface_alt;
    border: 1px solid $border;
    border-radius: 10px;
}
QFrame#WheelPanel QLabel, QFrame#WheelResult QLabel { background: transparent; }
QLabel#WheelWinner { font-size: $fs_heading; font-weight: 600; }

QRubberBand {
    background-color: $selection_fill;
    border: 1px solid $primary;
}

QToolTip {
    background-color: $surface;
    color: $text;
    border: 1px solid $border;
    border-radius: 6px;
    padding: 5px 8px;
}

QMenu, QMessageBox { background-color: $surface; }
QMenu::item:selected { background-color: $nav_active_bg; color: $nav_active_text; }

/* Last, so it wins over the variants: keyboard focus stays visible (WCAG
   2.4.7). Buttons from the helpers take focus by Tab only, not by click. */
QPushButton:focus:!pressed { border: 1px solid $accent; }
QCheckBox::indicator:focus { border-color: $accent; }
"""
)


def build_stylesheet(name: str) -> str:
    """Return the QSS for the requested theme, falling back to dark."""
    colors = PALETTES.get(name, PALETTES["dark"])
    extra = _party_extra(name) if name in _PARTY_LOOKS else ""
    return _STYLESHEET.substitute({**TYPE_SCALE, **colors}) + extra


def build_qpalette(name: str) -> QPalette:
    """Return a QPalette for native dialogs and popups, matching the theme colors."""
    colors = PALETTES.get(name, PALETTES["dark"])
    role = QPalette.ColorRole
    palette = QPalette()
    for color_role, key in (
        (role.Window, "bg"),
        (role.WindowText, "text"),
        (role.Base, "input_bg"),
        (role.AlternateBase, "surface_alt"),
        (role.Text, "text"),
        (role.Button, "surface_alt"),
        (role.ButtonText, "text"),
        (role.Highlight, "primary"),
        (role.HighlightedText, "primary_text"),
        (role.ToolTipBase, "surface"),
        (role.ToolTipText, "text"),
        (role.PlaceholderText, "text_muted"),
        (role.Link, "primary"),
    ):
        palette.setColor(color_role, QColor(colors[key]))
    for color_role in (role.Text, role.ButtonText):
        palette.setColor(
            QPalette.ColorGroup.Disabled, color_role, QColor(colors["text_muted"])
        )
    return palette


def repolish(widget: QWidget) -> None:
    """Force a restyle after a dynamic property (e.g. ``selected``) changed."""
    style = widget.style()
    style.unpolish(widget)
    style.polish(widget)
    widget.update()


class ThemeManager(QObject):
    """Manage the active theme and persist the user's choice.

    Signals:
        theme_changed(str): Emitted with the theme name after every apply;
            custom-painted widgets (e.g. the wheel) pick up the new colors.
    """

    theme_changed = pyqtSignal(str)

    def __init__(
        self, settings: QSettings | None = None, parent: QObject | None = None
    ) -> None:
        """Load the stored theme, defaulting to dark.

        Args:
            settings: Settings store; the app-wide one by default (tests pass
                their own).
            parent: Parent object.
        """
        super().__init__(parent)
        self._settings = settings or QSettings(ORGANIZATION, APPLICATION)
        stored = str(self._settings.value(SETTINGS_KEY, "dark"))
        self._name = stored if stored in PALETTES else "dark"

    @property
    def name(self) -> str:
        """Name of the active theme, a key of :data:`PALETTES`."""
        return self._name

    def palette(self) -> dict[str, str]:
        """Return the color palette of the active theme (keys like ``bg``, ``text``)."""
        return PALETTES[self._name]

    def apply(self, app: QApplication, name: str | None = None) -> str:
        """Apply a theme to the application and persist the choice.

        Sets the palette and stylesheet, restyles every existing widget and emits
        ``theme_changed``.

        Args:
            app: The running application.
            name: Theme to switch to; None or an unknown name reapplies the
                current theme.

        Returns:
            The name of the applied theme.
        """
        if name in PALETTES:
            self._name = name
        # Set before the stylesheet: its style change makes cards update their glow.
        app.setProperty("glow", PALETTES[self._name]["glow"])
        app.setPalette(build_qpalette(self._name))
        app.setStyleSheet(build_stylesheet(self._name))
        chaos.set_enabled(app, self._name if self._name in chaos.FLAVORS else None)
        self._settings.setValue(SETTINGS_KEY, self._name)
        for widget in app.allWidgets():
            repolish(widget)
        self.theme_changed.emit(self._name)
        return self._name

    @property
    def next_name(self) -> str:
        """Name of the theme :meth:`toggle` switches to."""
        names = list(THEME_LABELS)
        return names[(names.index(self._name) + 1) % len(names)]

    def toggle(self, app: QApplication) -> str:
        """Switch to the next theme (dark → light → … → heaven) and return its name."""
        return self.apply(app, self.next_name)
