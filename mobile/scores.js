// The phone's view of scores: export items + events not yet applied by the PC, and the outgoing change queue.
import { applyEvents, relPath, mediaKind } from './logic.js'
import { uploadChanges, epoch } from './mega.js'

const FLUSH_DELAY = 20000
const read = k => { try { const v = JSON.parse(localStorage.getItem(k)); return Array.isArray(v) ? v : [] } catch { return [] } }
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }
const stem = name => name.replace(/\.[^.]+$/, '')

// null without MediaVault data (or without a loaded export); else
// { lib, qKey, sKey, queue: events not uploaded, sent: [{ name, events }] not yet applied by the PC, keys, timer, busy }
let S = null
let listener = null
const cache = new Map() // node -> current item, dropped per node on record()

export const active = () => !!S
export const onChange = fn => { listener = fn }

export function activate(lib) {
  clearTimeout(S?.timer)
  cache.clear()
  S = null
  if (!lib?.export) return
  const id = lib.root.nodeId, items = lib.export.items ?? {}
  const applied = new Set(lib.export.applied ?? [])
  S = { lib, qKey: 'mv-queue:' + id, sKey: 'mv-sent:' + id, timer: 0, busy: false,
    keys: new Map(Object.keys(items).map(k => [k.toLowerCase(), k])) }
  S.queue = read(S.qKey)
  S.sent = read(S.sKey).filter(b => !applied.has(b.name)) // the export already contains those
  write(S.sKey, S.sent)
  if (S.queue.length) schedule(S) // left over from an earlier run
}

const exportItem = node => {
  const path = S && relPath(node, S.lib.root)
  const key = path && S.keys.get(path.toLowerCase())
  return key == null ? undefined : S.lib.export.items[key]
}

export const title = node => exportItem(node)?.title || stem(node.name)

export function item(node) {
  const path = S && relPath(node, S.lib.root)
  if (!path) return null
  let it = cache.get(node)
  if (!it) {
    // 50 is the PC default for entries it has not seen yet
    const base = exportItem(node) ?? { title: stem(node.name), type: mediaKind(node.name), score: 50, group: '', watched: 0, last_watched: 0, ratings: 0 }
    const low = path.toLowerCase()
    const events = [...S.sent.flatMap(b => b.events), ...S.queue].filter(e => e.path.toLowerCase() === low)
    it = applyEvents({ [path]: base }, events)[path]
    cache.set(node, it)
  }
  return it
}

export function record(node, kind, value) {
  const s = S, path = s && relPath(node, s.lib.root)
  if (!path) return
  const e = { path, kind, at: Math.round(Date.now()) / 1000 }
  if (kind !== 'view') {
    if (!Number.isFinite(value)) return
    const [lo, hi] = kind === 'rate' ? [1, 5] : [1, 100]
    e.value = Math.min(hi, Math.max(lo, Math.round(value)))
  }
  s.queue.push(e)
  write(s.qKey, s.queue)
  cache.delete(node)
  schedule(s)
  listener?.(node)
}

const schedule = s => { clearTimeout(s.timer); s.timer = setTimeout(flush, FLUSH_DELAY) }

// Uploads the queue as one change file; on failure the queue stays and is retried later.
export async function flush() {
  const s = S
  if (!s || s.busy || !s.queue.length) return
  clearTimeout(s.timer)
  s.busy = true
  const events = [...s.queue], gen = epoch()
  try {
    const name = await uploadChanges(s.lib.dataDir, events)
    if (gen !== epoch()) return // logged out meanwhile: the stored data is gone
    s.queue = s.queue.slice(events.length) // events recorded during the upload stay queued
    s.sent.push({ name, events })
    write(s.sKey, s.sent)
    write(s.qKey, s.queue)
  } catch (e) {
    console.warn('uploading changes failed', e)
  } finally {
    s.busy = false
    if (S === s && s.queue.length) schedule(s)
  }
}

document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush() })
addEventListener('pagehide', flush)
