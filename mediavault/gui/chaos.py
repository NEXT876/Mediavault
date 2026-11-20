"""Party mode: every effect PyQt has, at once, for the party themes.

Not practical on purpose. While on, an app-wide event filter and one timer add:
rainbow glow that cycles through all hues on buttons and inputs, a glow pulse
and a disco gradient on the hovered button, confetti on every click, a sparkle
trail behind the cursor, bouncing fade-in for every new window and an emoji
marquee in the window title. Each theme in :data:`FLAVORS` brings its own
colors, particles and physics (embers rise in the underworld, feathers sink
in heaven). :func:`set_enabled` switches it off cleanly.
"""

import math
import random

from PyQt6 import sip
from PyQt6.QtCore import (
    QEasingCurve,
    QEvent,
    QObject,
    QPoint,
    QPointF,
    QPropertyAnimation,
    Qt,
    QTimer,
)
from PyQt6.QtGui import QColor, QCursor, QFont, QPainter
from PyQt6.QtWidgets import (
    QAbstractButton,
    QApplication,
    QComboBox,
    QGraphicsDropShadowEffect,
    QLineEdit,
    QSpinBox,
    QWidget,
)

_FRAME_MS = 33  # ~30 fps
_GLOWABLE = (QAbstractButton, QLineEdit, QComboBox, QSpinBox)
# colors: glow/particle/button colors, cycled; ink: readable heading colors.
# click/trail: particle gravity (negative rises), fade: life lost per frame,
# drop: window entrance (start offset in px, duration ms, easing).
FLAVORS = {
    "chaos": {
        "colors": ("#ff0040", "#ff8c00", "#ffe600", "#00e676", "#00b0ff", "#d500f9"),
        "ink": ("#ff0040", "#ff8c00", "#ffe600", "#00e676", "#00b0ff", "#d500f9"),
        "glyphs": ["✦", "✧", "★", "☆", "✨", "❋", "✺"],
        "emoji": ["🌈", "✨", "🎆", "🦄", "💥", "🔥", "⭐", "🎉", "💖", "🚀"],
        "text": "#14002b", "checked": "#ffffff",
        "click": 0.45, "trail": 0.08, "fade": 0.025, "flicker": False,
        "drop": (-160, 900, QEasingCurve.Type.OutBounce),
    },
    "underworld": {
        "colors": ("#ff2200", "#ff7b00", "#ffcc00", "#8b0000", "#ff0044"),
        "ink": ("#ff2200", "#ff7b00", "#ffcc00", "#ff0044"),
        "glyphs": ["🔥", "✷", "✹", "☠", "💀", "⛧", "🦇", "•"],
        "emoji": ["🔥", "💀", "👹", "⛓️", "🦇", "🌋", "☠️", "🕷️", "😈"],
        "text": "#1a0000", "checked": "#ffd000",
        "click": -0.3, "trail": -0.15, "fade": 0.03, "flicker": True,
        "drop": (220, 1100, QEasingCurve.Type.OutBack),  # rises from below
    },
    "heaven": {
        "colors": ("#9fd8ff", "#ffffff", "#ffe9a8", "#e6c35c", "#bfe0ff", "#ffd1f0"),
        "ink": ("#3b82c4", "#c9a227", "#7a5aa8", "#1d4ed8"),
        "glyphs": ["☁", "✧", "✦", "❀", "♡", "🪶", "😇", "🕊️"],
        "emoji": ["☁️", "😇", "🕊️", "✨", "🌤️", "👼", "⭐", "🪽", "🎺"],
        "text": "#1d2b4f", "checked": "#d4af37",
        "click": 0.06, "trail": -0.05, "fade": 0.012, "flicker": False,
        "drop": (-260, 1800, QEasingCurve.Type.InOutSine),  # floats down
    },
}
_BORDERS = ("dashed", "dotted", "double", "groove", "ridge", "outset", "solid")
_HEADINGS = {"AppTitle", "PageTitle", "DialogTitle"}


def _blend(colors: tuple[str, ...], hue: float) -> QColor:
    """Color at ``hue`` degrees on a loop through ``colors``."""
    t = (hue % 360) / 360 * len(colors)
    i, f = int(t), t - int(t)
    a, b = QColor(colors[i]), QColor(colors[(i + 1) % len(colors)])
    return QColor(*(int(x + (y - x) * f) for x, y in zip(a.getRgb()[:3], b.getRgb()[:3], strict=True)))


def _random_button_style(flavor: dict) -> str:
    """A different loud look for every button, on purpose not uniform."""
    colors = flavor["colors"]
    hue = random.randrange(360)
    stops = ", ".join(
        f"stop:{i / 3:.2f} {_blend(colors, hue + i * random.randint(40, 120)).name()}"
        for i in range(4)
    )
    angle = random.choice(("x2:1, y2:0", "x2:0, y2:1", "x2:1, y2:1"))
    return (
        f"QAbstractButton {{ background: qlineargradient(x1:0, y1:0, {angle}, {stops});"
        f"color: {flavor['text']}; font-weight: 900;"
        f"border: {random.randint(2, 4)}px {random.choice(_BORDERS)} "
        f"{_blend(colors, random.randrange(360)).name()};"
        f"border-radius: {random.randint(4, 18)}px; }}"
        # The active page must stay recognizable in all this noise.
        f"QAbstractButton:checked {{ border: 5px solid {flavor['checked']}; }}"
    )

_instance: "_Chaos | None" = None


def set_enabled(app: QApplication, flavor: str | None) -> None:
    """Start party mode in the flavor of :data:`FLAVORS`, or stop it with None."""
    global _instance
    if _instance is not None and _instance.name != flavor:
        _instance.stop()
        _instance = None
    if flavor is not None and _instance is None:
        _instance = _Chaos(app, flavor)


def _alive(obj: QObject | None) -> bool:
    return obj is not None and not sip.isdeleted(obj)


class _Overlay(QWidget):
    """Click-through layer on top of a window that paints confetti and sparkles."""

    def __init__(self, window: QWidget, flavor: dict) -> None:
        super().__init__(window)
        self.flavor = flavor
        self.setObjectName("ChaosOverlay")
        self.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents)
        self.setAttribute(Qt.WidgetAttribute.WA_NoSystemBackground)
        # [x, y, vx, vy, life 1..0, color, glyph, gravity]
        self.particles: list[list] = []
        self.setGeometry(window.rect())
        self.show()

    def burst(self, pos: QPointF, count: int, speed: float, gravity: float) -> None:
        for _ in range(count):
            angle = random.uniform(0, math.tau)
            v = random.uniform(0.3, 1.0) * speed
            self.particles.append([
                pos.x(), pos.y(), math.cos(angle) * v, math.sin(angle) * v,
                1.0, _blend(self.flavor["colors"], random.randrange(360)),
                random.choice(self.flavor["glyphs"]), gravity,
            ])

    def step(self) -> None:
        for p in self.particles:
            p[0] += p[2]
            p[1] += p[3]
            p[3] += p[7]
            p[2] *= 0.97
            p[4] -= self.flavor["fade"]
        self.particles = [p for p in self.particles if p[4] > 0][-600:]
        self.setGeometry(self.parentWidget().rect())
        self.raise_()
        self.update()

    def paintEvent(self, _event) -> None:
        if not self.particles:
            return
        painter = QPainter(self)
        font = QFont(self.font())
        for x, y, _vx, _vy, life, color, glyph, _g in self.particles:
            painter.setOpacity(life)  # also fades color emoji, unlike pen alpha
            painter.setPen(color)
            font.setPixelSize(int(10 + 18 * life))
            painter.setFont(font)
            painter.drawText(QPointF(x, y), glyph)
        painter.end()


class _Chaos(QObject):
    def __init__(self, app: QApplication, name: str) -> None:
        super().__init__(app)
        self.name = name
        self._flavor = FLAVORS[name]
        self._app = app
        self._hue = 0
        self._frame = 0
        self._effects: list[QGraphicsDropShadowEffect] = []
        self._overlays: dict[int, _Overlay] = {}
        self._titles: dict[int, tuple[str, str]] = {}  # id -> (raw, decorated)
        self._disco: QWidget | None = None
        self._headings: list[QWidget] = []
        self._last_cursor = QCursor.pos()
        app.installEventFilter(self)
        for widget in app.allWidgets():
            self._decorate(widget)
        self._timer = QTimer(self)
        self._timer.timeout.connect(self._tick)
        self._timer.start(_FRAME_MS)

    # -- setup / teardown ------------------------------------------------------

    def _decorate(self, widget: QWidget) -> None:
        """Give buttons and inputs their own rainbow glow (once)."""
        if isinstance(widget, _GLOWABLE) and widget.graphicsEffect() is None:
            effect = QGraphicsDropShadowEffect(widget)
            effect.setOffset(0, 0)
            effect.setBlurRadius(28)
            effect.setProperty("chaos", True)
            widget.setGraphicsEffect(effect)
            self._effects.append(effect)
        if isinstance(widget, QAbstractButton) and not widget.styleSheet():
            widget.setProperty("chaos_style", _random_button_style(self._flavor))
            widget.setStyleSheet(widget.property("chaos_style"))
        if widget.objectName() in _HEADINGS:
            self._headings.append(widget)

    def _track(self, widget: QWidget) -> None:
        """Also recolor glows that widgets made themselves (e.g. hovered cards)."""
        if not _alive(widget):
            return
        effect = widget.graphicsEffect()
        if isinstance(effect, QGraphicsDropShadowEffect) and effect not in self._effects:
            self._effects.append(effect)

    def stop(self) -> None:
        self._timer.stop()
        self._app.removeEventFilter(self)
        for effect in self._effects:
            if _alive(effect) and effect.property("chaos"):
                effect.parent().setGraphicsEffect(None)
        for overlay in self._overlays.values():
            if _alive(overlay):
                overlay.hide()  # deleteLater waits for the event loop
                overlay.deleteLater()
        for widget in self._app.topLevelWidgets():
            raw, decorated = self._titles.get(id(widget), (None, None))
            if raw is not None and widget.windowTitle() == decorated:
                widget.setWindowTitle(raw)
        for widget in self._app.allWidgets():
            if widget.property("chaos_style"):
                widget.setProperty("chaos_style", None)
                widget.setStyleSheet("")
        for widget in self._headings:
            if _alive(widget):
                widget.setStyleSheet("")
        self.deleteLater()

    # -- events ----------------------------------------------------------------

    def eventFilter(self, obj: QObject, event: QEvent) -> bool:
        if not isinstance(obj, QWidget) or isinstance(obj, _Overlay):
            return False
        kind = event.type()
        if kind == QEvent.Type.Show:
            if obj.isWindow():
                self._entrance(obj)
            else:
                self._decorate(obj)
        elif kind == QEvent.Type.Enter:
            QTimer.singleShot(0, lambda w=obj: self._track(w))
            if isinstance(obj, QAbstractButton):
                self._hover(obj, True)
        elif kind == QEvent.Type.Leave and isinstance(obj, QAbstractButton):
            self._hover(obj, False)
        elif kind == QEvent.Type.MouseButtonPress:
            overlay = self._overlay(obj.window())
            pos = overlay.mapFromGlobal(QCursor.pos()).toPointF()
            overlay.burst(pos, 45, 11, self._flavor["click"])
        return False

    def _hover(self, button: QAbstractButton, entered: bool) -> None:
        """Pump the glow up on hover, and turn the button into a disco ball."""
        effect = button.graphicsEffect()
        if isinstance(effect, QGraphicsDropShadowEffect):
            anim = QPropertyAnimation(effect, b"blurRadius", self)
            anim.setDuration(450)
            anim.setEndValue(75.0 if entered else 28.0)
            anim.setEasingCurve(QEasingCurve.Type.OutElastic)
            anim.start(QPropertyAnimation.DeletionPolicy.DeleteWhenStopped)
        if _alive(self._disco):
            self._disco.setStyleSheet(self._disco.property("chaos_style") or "")
        self._disco = button if entered else None

    def _entrance(self, window: QWidget) -> None:
        """PowerPoint "Bounce" entrance: fade in and drop into place."""
        fade = QPropertyAnimation(window, b"windowOpacity", self)
        fade.setDuration(700)
        fade.setStartValue(0.0)
        fade.setEndValue(1.0)
        fade.start(QPropertyAnimation.DeletionPolicy.DeleteWhenStopped)
        if window.isMaximized() or window.isFullScreen():
            return
        offset, duration, easing = self._flavor["drop"]
        bounce = QPropertyAnimation(window, b"pos", self)
        bounce.setDuration(duration)
        bounce.setStartValue(window.pos() + QPoint(0, offset))
        bounce.setEndValue(window.pos())
        bounce.setEasingCurve(easing)
        bounce.start(QPropertyAnimation.DeletionPolicy.DeleteWhenStopped)

    def _overlay(self, window: QWidget) -> _Overlay:
        overlay = self._overlays.get(id(window))
        if not _alive(overlay):
            overlay = self._overlays[id(window)] = _Overlay(window, self._flavor)
        return overlay

    # -- animation frame -------------------------------------------------------

    def _tick(self) -> None:
        self._frame += 1
        self._hue = (self._hue + 5) % 360
        self._effects = [e for e in self._effects if _alive(e)]
        colors = self._flavor["colors"]
        for i, effect in enumerate(self._effects):
            effect.setColor(_blend(colors, self._hue + i * 37))
            if self._flavor["flicker"] and effect.property("chaos"):
                effect.setBlurRadius(random.uniform(18, 45))  # firelight

        if _alive(self._disco):
            stops = ", ".join(
                f"stop:{i / 5:.1f} {_blend(colors, self._hue * 3 + i * 60).name()}"
                for i in range(6)
            )
            self._disco.setStyleSheet(
                f"background: qlineargradient(x1:0, y1:0, x2:1, y2:1, {stops});"
            )

        self._headings = [w for w in self._headings if _alive(w)]
        for i, label in enumerate(self._headings):
            color = _blend(self._flavor["ink"], self._hue * 2 + i * 90).name()
            label.setStyleSheet(f"color: {color};")

        window = self._app.activeWindow()
        if window is not None:
            cursor = QCursor.pos()
            if cursor != self._last_cursor:
                overlay = self._overlay(window)
                overlay.burst(
                    overlay.mapFromGlobal(cursor).toPointF(), 2, 2.5, self._flavor["trail"]
                )
                self._last_cursor = cursor
        for key, overlay in list(self._overlays.items()):
            if _alive(overlay):
                overlay.step()
            else:
                del self._overlays[key]

        if self._frame % 12 == 0:
            self._marquee()

    def _marquee(self) -> None:
        """Wrap every window title in rotating emoji."""
        n = self._frame // 12
        emoji = self._flavor["emoji"]
        for widget in self._app.topLevelWidgets():
            if not widget.isVisible():
                continue
            title = widget.windowTitle()
            raw, decorated = self._titles.get(id(widget), (title, None))
            if title != decorated:
                raw = title  # the app changed the title itself
            left = [emoji[(n + i) % len(emoji)] for i in range(3)]
            decorated = f"{''.join(left)} {raw} {''.join(reversed(left))}"
            self._titles[id(widget)] = (raw, decorated)
            widget.setWindowTitle(decorated)
