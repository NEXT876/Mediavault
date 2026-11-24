export const UPLOAD_FOLDER = 'Vom Handy'
export const DATA_DIR = '_MediaVault' // PC <-> phone data folder inside the library

const IMAGES = ['png', 'jpg', 'jpeg', 'bmp', 'webp']
const VIDEOS = ['mp4', 'mkv', 'avi', 'mov', 'webm', 'm4v', 'wmv']
const MIME = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', bmp: 'image/bmp', webp: 'image/webp',
  mp4: 'video/mp4', mkv: 'video/x-matroska', avi: 'video/x-msvideo', mov: 'video/quicktime',
  webm: 'video/webm', m4v: 'video/x-m4v', wmv: 'video/x-ms-wmv',
}

const ext = name => (name.includes('.') ? name.split('.').pop().toLowerCase() : '')

export function mediaKind(name) {
  const e = ext(name)
  return IMAGES.includes(e) ? 'image' : VIDEOS.includes(e) ? 'video' : null
}

export const mimeType = name => (Object.hasOwn(MIME, ext(name)) ? MIME[ext(name)] : 'application/octet-stream')

export function collectMedia(folder) {
  return (folder.children ?? []).flatMap(n =>
    n.directory ? (n.name === DATA_DIR ? [] : collectMedia(n)) : mediaKind(n.name) ? [n] : [])
}

// Every folder under root (Cloud Drive, so not Rubbish Bin/Inbox/shares) with its path and media count.
export function listFolders(root) {
  const out = []
  const walk = (dir, prefix) => {
    for (const n of dir.children ?? []) {
      if (!n.directory || n.name === DATA_DIR) continue
      const path = prefix + (n.name ?? '?')
      out.push({ node: n, path, count: collectMedia(n).length })
      walk(n, path + ' / ')
    }
  }
  walk(root, '')
  return out.sort((a, b) => a.path.localeCompare(b.path, 'de', { numeric: true, sensitivity: 'base' }))
}

const byName = (a, b) => a.name.localeCompare(b.name, 'de', { numeric: true, sensitivity: 'base' })

export function sortEntries(nodes, mode) {
  const cmp = mode === 'date' ? (a, b) => (b.timestamp - a.timestamp) || byName(a, b) : byName
  return [...nodes].sort(cmp)
}

export function uniqueName(name, taken) {
  const dot = name.lastIndexOf('.')
  const [stem, suffix] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, '']
  let pick = name
  for (let i = 2; taken.has(pick.toLowerCase()); i++) pick = `${stem}-${i}${suffix}`
  taken.add(pick.toLowerCase())
  return pick
}

// fetch() rejects with a TypeError whose text differs per browser; other TypeErrors are bugs, not offline
export const isNetworkError = e =>
  e instanceof TypeError && /load failed|failed to fetch|networkerror|network connection/i.test(e.message)

// '/'-joined names from below root down to node (the key in phone.json), null if node is not under root.
export function relPath(node, root) {
  const names = []
  for (let n = node; n; n = n.parent) {
    if (n === root) return names.join('/')
    names.unshift(n.name)
  }
  return null
}

export const RATING_DELTA = { 1: -10, 2: -5, 3: 0, 4: 5, 5: 10 }
const clamp = v => Math.min(100, Math.max(1, v))

// Same rules as mediavault/phone.py: events by ascending `at`, paths case-insensitive, unknown paths dropped.
export function applyEvents(items, events) {
  const out = Object.fromEntries(Object.entries(items).map(([k, v]) => [k, { ...v }]))
  const keys = new Map()
  for (const k of Object.keys(out)) if (!keys.has(k.toLowerCase())) keys.set(k.toLowerCase(), k)
  for (const e of [...events].sort((a, b) => a.at - b.at)) {
    const it = out[keys.get(e.path.toLowerCase())]
    if (!it) continue
    if (e.kind === 'set') { it.score = clamp(e.value); continue }
    if (e.kind === 'rate') { it.score = clamp(it.score + RATING_DELTA[e.value]); it.ratings++ }
    it.watched++
    it.last_watched = Math.max(it.last_watched, e.at)
  }
  return out
}

export const scoreTier = score => (score >= 75 ? 'high' : score >= 50 ? 'mid' : score >= 25 ? 'low' : 'bad')

// Weight of mediavault/database.py get_random; `now` and last_watched are unix seconds.
export function smartWeight(item, now) {
  const { score, watched, last_watched } = item ?? { score: 50, watched: 0, last_watched: 0 }
  let w = (score + 20) * 0.85 ** watched
  if (last_watched > 0) {
    const days = (now - last_watched) / 86400
    if (days < 1) w *= 0.3
    else if (days < 7) w *= 0.6
  }
  return Math.max(1, w)
}

// Nodes of one of `kinds` ('image'|'video') whose current group (itemOf(node)?.group) is in `groups` (null = any group).
export function randomPool(nodes, { kinds, groups }, itemOf) {
  return nodes.filter(n => kinds.includes(mediaKind(n.name)) && (!groups || groups.includes(itemOf(n)?.group)))
}

// One element of pool (null if empty); `recent` is skipped unless it would empty the pool; weightOf null = uniform.
export function pickRandom(pool, weightOf, recent, rnd = Math.random) {
  const rest = pool.filter(x => !recent.includes(x))
  const from = rest.length ? rest : pool
  if (!from.length) return null
  if (!weightOf) return from[Math.floor(rnd() * from.length)]
  const weights = from.map(weightOf)
  let r = rnd() * weights.reduce((a, b) => a + b, 0)
  return from.find((_, i) => (r -= weights[i]) < 0) ?? from.at(-1)
}

// Port of mediavault/extras/wheel/page.py target_angle: end angle (deg) that puts slice `index` under the top pointer.
export function targetAngle(current, index, count, turns) {
  const mod = (a, n) => ((a % n) + n) % n
  const slice = 360 / count
  const targetMod = mod(-(index * slice + slice / 2), 360)
  let target = current + turns * 360
  target += mod(targetMod - target, 360)
  if (target - current < 3.2 * 360) target += 360
  return target
}

// Port of mediavault/extras/wheel/page.py parse_entries: one trimmed entry per non-empty line.
export const parseEntries = text => text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)

// Port of _contrast_color: weighted sum of the sRGB channels (not linearised, like the PC), '#rrggbb' in.
export function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export const contrastColor = hex => (luminance(hex) > 0.52 ? '#11141c' : '#ffffff')
