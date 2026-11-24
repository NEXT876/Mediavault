// Wheel of fortune (Glücksrad), a port of mediavault/extras/wheel/page.py: canvas wheel, entries editor, result card.
import { targetAngle, parseEntries, contrastColor, luminance, labelFlipped } from './logic.js'
import { chooseGroups } from './sheet.js'

const $ = id => document.getElementById(id)
const COLORS = ['#4f8cff', '#ff6b6b', '#ffd93d', '#2f9e6f', '#b983ff', '#ff9f45', '#25c4a8', '#f76fb4', '#8ac6ff', '#c6e86b', '#7c6cf6', '#ffbf69']
const DEMO = ['Pizza', 'Sushi', 'Burger', 'Pasta', 'Salat', 'Döner', 'Ramen', 'Curry']
const KEY = 'mv-wheel'
const MARGIN = 26 // room for the pointer and the shadow
const RAD = Math.PI / 180
const rand = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i])
const store = {
  get: () => { try { return localStorage.getItem(KEY) } catch { return null } },
  set: v => { try { localStorage.setItem(KEY, v) } catch {} },
}
const hubRadius = R => Math.max(26, R * 0.15)
// label size: smaller for many slices, scaled by the radius
function fontSize(count, R) {
  const base = [[6, 18], [10, 16], [16, 14], [24, 12], [36, 10.5]].find(([limit]) => count <= limit)?.[1] ?? 9
  return Math.max(8, Math.round(base * Math.min(1.5, Math.max(0.86, R / 300))))
}
function elide(c, text, max) {
  if (c.measureText(text).width <= max) return text
  let lo = 0, hi = text.length
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (c.measureText(text.slice(0, mid).trimEnd() + '…').width <= max) lo = mid
    else hi = mid - 1
  }
  return text.slice(0, lo).trimEnd() + '…'
}

// getExport: () => the library export (or null); toast: text => void. Returns { refresh } (export or theme changed).
export function initWheel({ getExport, toast }) {
  const cv = $('wcanvas'), box = $('wbox'), text = $('wtext'), ctx = cv.getContext('2d')
  let entries = [], angle = 0, winning = null, spinning = false, loaded = null, debounce, pal, lay
  const lists = () => getExport()?.wheel ?? {}

  function palette() {
    const s = getComputedStyle(document.documentElement)
    const p = Object.fromEntries(['bg', 'surface', 'bstrong', 'text', 'muted', 'primary'].map(k => [k, s.getPropertyValue('--' + k).trim()]))
    return { ...p, family: getComputedStyle(document.body).fontFamily }
  }

  function draw() {
    const { width: w, height: h } = box.getBoundingClientRect()
    if (!w || !h) return // page hidden
    const dpr = devicePixelRatio || 1
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr) }
    if (!spinning || !pal) pal = palette()
    const c = ctx, cx = w / 2, cy = h / 2, R = Math.max(40, Math.min(w, h) / 2 - MARGIN), n = entries.length
    c.setTransform(dpr, 0, 0, dpr, 0, 0)
    c.clearRect(0, 0, w, h)
    c.textAlign = 'center'; c.textBaseline = 'middle'
    if (!n) return drawEmpty(c, cx, cy, R)

    // soft ring shadow, stronger on dark themes
    const glowR = R * 1.18, shade = luminance(pal.bg) < 0.5 ? 0.35 : 0.09
    const glow = c.createRadialGradient(cx, cy, 0, cx, cy, glowR)
    for (const [at, a] of [[0, 0], [0.76, 0], [0.84, shade], [1, 0]]) glow.addColorStop(at, `rgba(0,0,0,${a})`)
    c.fillStyle = glow
    c.beginPath(); c.arc(cx, cy, glowR, 0, 2 * Math.PI); c.fill()

    c.save()
    c.translate(cx, cy); c.rotate(angle * RAD)
    const step = 2 * Math.PI / n, start = i => -Math.PI / 2 + i * step // slice 0 starts at 12 o'clock, clockwise
    const wedge = i => { c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, R, start(i), start(i + 1)); c.closePath() }
    const colorOf = i => COLORS[i === n - 1 && i % COLORS.length === 0 && n > 1 ? 1 : i % COLORS.length] // no equal neighbours at the seam
    for (let i = 0; i < n; i++) { wedge(i); c.fillStyle = colorOf(i); c.fill() }
    c.strokeStyle = pal.bg; c.globalAlpha = 0.35; c.lineWidth = 1.4; c.lineCap = 'round'
    for (let i = 0; i < n; i++) { c.beginPath(); c.moveTo(0, 0); c.lineTo(R * Math.cos(start(i)), R * Math.sin(start(i))); c.stroke() }
    c.globalAlpha = 1
    const depth = c.createRadialGradient(0, 0, 0, 0, 0, R) // slightly darker towards the rim
    for (const [at, col] of [[0, 'rgba(255,255,255,.086)'], [0.5, 'rgba(255,255,255,0)'], [0.86, 'rgba(5,7,12,0)'], [1, 'rgba(5,7,12,.235)']]) depth.addColorStop(at, col)
    c.fillStyle = depth
    c.beginPath(); c.arc(0, 0, R, 0, 2 * Math.PI); c.fill()
    if (winning !== null && winning < n) {
      wedge(winning)
      c.fillStyle = 'rgba(255,255,255,.165)'; c.fill()
      c.strokeStyle = 'rgba(255,255,255,.86)'; c.lineWidth = 2.4; c.lineJoin = 'round'; c.stroke()
    }
    // radial labels ending at the rim; see labelFlipped for which half is turned
    c.font = `600 ${fontSize(n, R)}px ${pal.family}`
    const key = `${R}|${c.font}|${entries.join('\n')}`
    if (lay?.key !== key) lay = { key, labels: entries.map(e => elide(c, e, Math.max(20, R - 18 - hubRadius(R) - 16))) }
    for (let i = 0; i < n; i++) {
      const mid = (i + 0.5) * 360 / n, left = labelFlipped(mid)
      c.save()
      c.rotate((left ? mid + 90 : mid - 90) * RAD)
      c.fillStyle = contrastColor(colorOf(i))
      c.textAlign = left ? 'left' : 'right'
      c.fillText(lay.labels[i], left ? -(R - 18) : R - 18, 0)
      c.restore()
    }
    c.restore()

    c.strokeStyle = pal.bstrong; c.lineWidth = 2
    c.beginPath(); c.arc(cx, cy, R + 1, 0, 2 * Math.PI); c.stroke()
    const hub = hubRadius(R)
    c.fillStyle = pal.surface; c.lineWidth = 1.4
    c.beginPath(); c.arc(cx, cy, hub, 0, 2 * Math.PI); c.fill(); c.stroke()
    c.strokeStyle = pal.primary; c.lineWidth = 2
    c.beginPath(); c.arc(cx, cy, hub + 5, 0, 2 * Math.PI); c.stroke()
    c.fillStyle = pal.muted; c.font = `700 ${Math.max(10, Math.floor(hub * 0.32))}px ${pal.family}`
    c.fillText('SPIN', cx, cy)
    const half = Math.max(9, R * 0.045) // pointer
    c.beginPath(); c.moveTo(cx, cy - R + 10); c.lineTo(cx - half, cy - R - 18); c.lineTo(cx + half, cy - R - 18); c.closePath()
    c.fillStyle = pal.text; c.strokeStyle = pal.surface; c.lineWidth = 1.6; c.lineJoin = 'round'
    c.fill(); c.stroke()
  }

  function drawEmpty(c, cx, cy, R) {
    c.fillStyle = pal.surface; c.strokeStyle = pal.bstrong; c.lineWidth = 2; c.setLineDash([8, 5])
    c.beginPath(); c.arc(cx, cy, R, 0, 2 * Math.PI); c.fill(); c.stroke()
    c.setLineDash([])
    c.fillStyle = pal.text; c.font = `600 18px ${pal.family}`
    c.fillText('Keine Einträge', cx, cy - 12, 2 * R - 24)
    c.fillStyle = pal.muted; c.font = `14px ${pal.family}`
    c.fillText('Einen Eintrag pro Zeile schreiben', cx, cy + 14, 2 * R - 24)
  }

  // enabled state of every control; list and group buttons need the PC export
  function lock() {
    const exp = getExport()
    $('wtext').readOnly = spinning
    $('wclear').disabled = spinning
    $('wlist').disabled = $('wload').disabled = spinning || !Object.keys(lists()).length
    $('wall').disabled = $('wpick').disabled = spinning || !exp
    $('whint').hidden = !!exp
    $('wspin').disabled = spinning || !entries.length
    $('wspin').textContent = spinning ? 'Dreht …' : 'Drehen'
  }

  function apply() {
    clearTimeout(debounce); debounce = null
    entries = parseEntries(text.value)
    winning = null
    store.set(text.value)
    $('wcount').textContent = entries.length === 1 ? '1 Eintrag' : `${entries.length} Einträge`
    lock(); draw()
  }

  // entries typed or loaded: replacing unsaved ones asks once
  function replace(list) {
    const cur = parseEntries(text.value), exp = getExport()
    const known = [DEMO, loaded, exp?.groups, ...Object.values(lists())]
    if (cur.length && !known.some(k => k && same(k, cur)) && !confirm(`Die aktuellen ${cur.length} Einträge gehen beim Ersetzen verloren. Ersetzen?`)) return
    loaded = list
    text.value = list.join('\n')
    apply()
  }

  function spin() {
    if (debounce) apply() // text typed within the debounce delay goes on the wheel first
    if (spinning || !entries.length) return
    const n = entries.length, index = Math.floor(rand() * n)
    const from = angle, to = targetAngle(from, index, n, 4.2 + rand() * 2.6)
    const ms = 3900 + rand() * 1400 // the reduced-motion duration is a flat 600 ms, set below
    const quick = matchMedia('(prefers-reduced-motion: reduce)').matches
    spinning = true; winning = null
    $('wwinner').textContent = '…'
    lock()
    let t0
    const tick = now => {
      t0 ??= now
      const t = Math.min(1, (now - t0) / (quick ? 600 : ms))
      angle = from + (to - from) * (1 - (1 - t) ** 4) // OutQuart
      if (t < 1) { draw(); return requestAnimationFrame(tick) }
      angle = ((to % 360) + 360) % 360 // identical look, small number
      spinning = false; winning = index
      cv.dataset.angle = angle // test hook: the smoke test reads the final angle to find the slice under the pointer
      $('wwinner').textContent = entries[index]
      $('wwinner').animate({ opacity: [0, 1] }, { duration: quick ? 0 : 420, easing: 'ease-out' })
      lock(); draw()
    }
    requestAnimationFrame(tick)
  }

  text.value = parseEntries(store.get() ?? '').length ? store.get() : DEMO.join('\n')
  text.oninput = () => { clearTimeout(debounce); debounce = setTimeout(apply, 120) }
  cv.onclick = $('wspin').onclick = spin
  cv.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); spin() } }
  $('wclear').onclick = () => { text.value = ''; apply() }
  $('wload').onclick = () => { const l = lists()[$('wlist').value]; if (l) replace(l) }
  $('wall').onclick = () => {
    const groups = getExport()?.groups ?? []
    if (groups.length) replace(groups)
    else toast('In dieser Bibliothek gibt es keine Gruppen.')
  }
  $('wpick').onclick = async () => {
    const r = await chooseGroups({
      title: 'Gruppen aufs Rad', groups: getExport()?.groups ?? [], types: false,
      actions: [{ id: 'ok', label: 'Aufs Rad', primary: true }],
    })
    if (r) replace(r.groups)
  }
  new ResizeObserver(draw).observe(box)

  function refresh() {
    const sel = $('wlist'), names = Object.keys(lists()).sort((a, b) => a.localeCompare(b))
    const keep = sel.value
    sel.replaceChildren(...(names.length ? names : ['– keine Listen vom PC –']).map(n => new Option(n, n)))
    if (names.includes(keep)) sel.value = keep
    pal = null
    lock(); draw()
  }
  apply(); refresh()
  return { refresh }
}
