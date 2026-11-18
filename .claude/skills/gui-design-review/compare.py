"""Put before and after screenshots side by side in one image.

    python .claude/skills/gui-design-review/compare.py BEFORE_DIR AFTER_DIR OUT.png

Every PNG that exists in both folders becomes one row: before on the left,
after on the right, scaled to 60 %. Uses PyQt6, which the app already needs.
"""

import os
import sys

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

from PyQt6.QtCore import QRectF, Qt  # noqa: E402
from PyQt6.QtGui import QColor, QFont, QGuiApplication, QImage, QPainter  # noqa: E402

SCALE = 0.6
PAD = 24
HEAD = 56
LEFT = 170
BACKGROUND = "#14151a"
TEXT = "#ecebf5"


def main(before_dir: str, after_dir: str, out_path: str) -> None:
    """Draw the comparison grid and save it to ``out_path``."""
    _app = QGuiApplication([])  # QPainter needs an application for fonts
    names = sorted(
        name
        for name in os.listdir(before_dir)
        if name.endswith(".png") and os.path.isfile(os.path.join(after_dir, name))
    )
    if not names:
        sys.exit("No PNG exists in both folders.")
    first = QImage(os.path.join(before_dir, names[0]))
    cell_w, cell_h = int(first.width() * SCALE), int(first.height() * SCALE)
    width = LEFT + 2 * (cell_w + PAD) + PAD
    height = HEAD + len(names) * (cell_h + PAD) + PAD

    canvas = QImage(width, height, QImage.Format.Format_RGB32)
    canvas.fill(QColor(BACKGROUND))
    painter = QPainter(canvas)
    painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform)
    font = QFont()
    font.setPixelSize(22)
    font.setWeight(QFont.Weight.DemiBold)
    painter.setFont(font)
    painter.setPen(QColor(TEXT))
    center = Qt.AlignmentFlag.AlignCenter

    for column, label in enumerate(("Vorher", "Nachher")):
        x = LEFT + PAD + column * (cell_w + PAD)
        painter.drawText(QRectF(x, 0, cell_w, HEAD), center, label)
    for row, name in enumerate(names):
        y = HEAD + PAD + row * (cell_h + PAD)
        title = os.path.splitext(name)[0].replace("_", " ")
        painter.drawText(QRectF(0, y, LEFT, cell_h), center | Qt.TextFlag.TextWordWrap, title)
        for column, folder in enumerate((before_dir, after_dir)):
            x = LEFT + PAD + column * (cell_w + PAD)
            image = QImage(os.path.join(folder, name))
            painter.drawImage(QRectF(x, y, cell_w, cell_h), image)
    painter.end()
    canvas.save(out_path)
    print(f"{len(names)} rows written to {out_path}")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
