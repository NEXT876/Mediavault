export const UPLOAD_FOLDER = 'Vom Handy'

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
    n.directory ? collectMedia(n) : mediaKind(n.name) ? [n] : [])
}

// Only folders under root count (not Rubbish Bin, Inbox, shares); the least nested match wins.
export function findFolder(nodes, name, root) {
  const want = name.trim().toLowerCase()
  const depth = n => { let d = 0; for (let p = n; p; p = p.parent, d++) if (p === root) return d; return -1 }
  let best = null, bestDepth = Infinity
  for (const n of nodes) {
    if (!n.directory || n.name.trim().toLowerCase() !== want) continue
    const d = depth(n)
    if (d >= 0 && d < bestDepth) [best, bestDepth] = [n, d]
  }
  return best
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
