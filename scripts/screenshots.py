"""Regenerate the README screenshots in docs/screenshots/.

Run by hand from the repository root, not in CI (fonts and pixels differ
between systems):

    python scripts/screenshots.py

Builds a demo library of painted landscapes in a temporary home folder, so the
real ~/.mediavault is never touched, and grabs the main window offscreen at
1180x860: the library in the dark, light and neon theme, and the wheel.
"""

import json
import math
import os
import random
import sys
import tempfile
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "docs", "screenshots")
SIZE = (1180, 860)

# Title, score, group, sky top, sky bottom, three mountain layers (front last).
SCENES = (
    ("Autumn Forest", 86, "Nature", "#c2621c", "#a14a16", ("#6b3420", "#4a2416", "#2e170e")),
    ("Coast", 64, "Travel", "#3d8fd9", "#6ab0e8", ("#3c8a4a", "#26663a", "#17402a")),
    ("Desert Dusk", 58, "Travel", "#8c2235", "#b0453a", ("#6e2430", "#4a1722", "#2a0d14")),
    ("Fjord", 82, "Travel", "#1f5c99", "#2f6fa8", ("#1c3d66", "#142c4d", "#0c1c33")),
    ("Glacier", 49, "Travel", "#6fb6e8", "#a4d2f2", ("#3a7fb0", "#235f8c", "#14405f")),
    ("Harbor at Night", 69, "City", "#16142e", "#24204a", ("#1f1c3a", "#15132a", "#0c0b1a")),
    ("Lavender Field", 73, "Nature", "#7a3d99", "#a565bd", ("#5a2c70", "#42205a", "#2a1438")),
    ("Morning Lake", 63, "Nature", "#ff9f73", "#ffc49e", ("#3a4d8c", "#283a70", "#1a2650")),
    ("Night Peaks", 91, "Nature", "#0c0b26", "#1a1940", ("#16153a", "#0f0e2a", "#08081a")),
    ("Rainforest", 77, "Nature", "#0c3a2e", "#155a45", ("#0f4a38", "#0a3328", "#06211a")),
    ("Rose Valley", 55, "Travel", "#4a2a4a", "#7a4a6a", ("#4a2c48", "#341d33", "#201220")),
    ("Sunset Canyon", 88, "Travel", "#f08a2c", "#f5a64a", ("#b0481c", "#863414", "#5a220c")),
)


def paint_landscape(path: str, seed: int, scene: tuple) -> None:
    """Paint a sky with a glowing sun and three mountain ridges to ``path``."""
    from PyQt6.QtCore import QPointF
    from PyQt6.QtGui import (
        QColor,
        QImage,
        QLinearGradient,
        QPainter,
        QPainterPath,
        QRadialGradient,
    )

    _title, _score, _group, top, bottom, layers = scene
    width, height = 480, 360
    image = QImage(width, height, QImage.Format.Format_RGB32)
    painter = QPainter(image)
    painter.setRenderHint(QPainter.RenderHint.Antialiasing)
    sky = QLinearGradient(0, 0, 0, height)
    sky.setColorAt(0, QColor(top))
    sky.setColorAt(1, QColor(bottom))
    painter.fillRect(image.rect(), sky)

    rnd = random.Random(seed)
    sun_center = QPointF(rnd.uniform(0.3, 0.8) * width, rnd.uniform(0.18, 0.35) * height)
    sun = QRadialGradient(sun_center, 46)
    sun.setColorAt(0, QColor(255, 250, 235))
    sun.setColorAt(0.3, QColor(255, 240, 200, 220))
    sun.setColorAt(1, QColor(255, 230, 180, 0))
    painter.fillRect(image.rect(), sun)

    for depth, color in enumerate(layers):
        base = height * (0.48 + 0.14 * depth)
        phases = [rnd.uniform(0, 6) for _ in range(3)]
        ridge = QPainterPath(QPointF(0, height))
        for x in range(0, width + 8, 8):
            y = (
                base
                - 26 * math.sin(x / 70 + phases[0])
                - 14 * math.sin(x / 31 + phases[1])
                - 6 * math.sin(x / 13 + phases[2])
            )
            ridge.lineTo(x, y)
        ridge.lineTo(width, height)
        ridge.closeSubpath()
        painter.fillPath(ridge, QColor(color))
    painter.end()
    image.save(path)


def settle(app, seconds: float = 0.9) -> None:
    """Let Qt finish layouts and the background thumbnail loads."""
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        app.processEvents()
        time.sleep(0.02)


def main() -> None:
    """Build the demo library and write all screenshots."""
    home = tempfile.mkdtemp(prefix="mediavault-shots-")
    # APP_DIR is computed at import time, so the home folder is set first.
    os.environ["HOME"] = os.environ["USERPROFILE"] = home
    os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")
    sys.path.insert(0, ROOT)

    from PyQt6.QtCore import QSettings
    from PyQt6.QtWidgets import QApplication

    app = QApplication([])
    app.setStyle("Fusion")
    # The system UI font, not the app's list: where Segoe UI and Noto Sans are
    # missing, the list falls back to DejaVu, whose height breaks round badges.

    from mediavault.config import APP_DIR
    from mediavault.gui.main_window import MainWindow
    from mediavault.gui.sidebar import WHEEL
    from mediavault.gui.theme import ThemeManager
    from mediavault.gui.widgets import MediaCard

    images = os.path.join(home, "images")
    os.makedirs(images)
    os.makedirs(APP_DIR, exist_ok=True)
    entries = []
    for seed, scene in enumerate(SCENES):
        path = os.path.join(images, f"{scene[0]}.png")
        paint_landscape(path, seed, scene)
        entries.append(
            {"title": scene[0], "image_path": path, "score": scene[1], "group": scene[2]}
        )
    with open(os.path.join(APP_DIR, "media_data.json"), "w", encoding="utf-8") as f:
        json.dump(entries, f)

    # Own settings file: the theme choice must not land in the user's real one.
    settings = QSettings(os.path.join(home, "settings.ini"), QSettings.Format.IniFormat)
    theme = ThemeManager(settings)
    theme.apply(app, "dark")
    window = MainWindow(theme)
    window.resize(*SIZE)
    window.show()
    window.refresh_data()
    settle(app, 1.5)

    os.makedirs(OUT_DIR, exist_ok=True)
    for name in ("dark", "light", "neon"):
        theme.apply(app, name)
        window.sidebar.set_theme(theme.next_name)
        window.grid.clear_selection()
        if name == "neon":
            # Show the glow: two selected cards and one under the mouse.
            window.grid.set_selection(window.grid.entries[1:3])
            cards = {card.entry.title: card for card in window.findChildren(MediaCard)}
            cards["Lavender Field"]._update_glow(hovered=True)
        settle(app)
        window.grab().save(os.path.join(OUT_DIR, f"library_{name}.png"))

    window.grid.clear_selection()
    theme.apply(app, "dark")
    window.sidebar.set_theme(theme.next_name)
    window._show_page(WHEEL)
    settle(app)
    window.grab().save(os.path.join(OUT_DIR, "wheel.png"))
    print(f"Screenshots written to {OUT_DIR}")


if __name__ == "__main__":
    main()
