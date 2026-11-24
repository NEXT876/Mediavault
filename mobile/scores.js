// The phone's view of scores: export items + events not yet applied by the PC, and the outgoing change queue.
import { applyEvents, relPath, liveBatches } from './logic.js'
import { uploadChanges, newChangeName, changeNames, epoch } from './mega.js'

const FLUSH_DELAY = 20000
const read = k => { try { const v = JSON.parse(localStorage.getItem(k)); return Array.isArray(v) ? v : [] } catch { return [] } }
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }
const stem = name => name.replace(/\.[^.]+$/, '')

// null without MediaVault data (or without a loaded export); else
// { lib, qKey, sKey, queue: events not in a batch yet, sent: [{ name, events, pending? }] batches not yet applied by the PC
// (pending = name reserved, upload not confirmed), keys, byPath: lowercased path -> its unapplied events, timer, busy }
let S = null
let listener = null
const cache = new Map() // node -> current item, dropped per node on record()

export const onChange = fn => { listener = fn }

export function activate(lib) {
  clearTimeout(S?.timer)
  cache.clear()
  S = null
  if (!lib?.export) return
  const id = lib.root.nodeId, items = lib.export.items ?? {}
  S = { lib, qKey: 'mv-queue:' + id, sKey: 'mv-sent:' + id, timer: 0, busy: false,
    keys: new Map(Object.keys(items).map(k => [k.toLowerCase(), k])) }
  S.queue = read(S.qKey)
  S.sent = liveBatches(read(S.sKey), new Set(lib.export.applied ?? []), changeNames(lib.dataDir))
  write(S.sKey, S.sent)
  S.byPath = new Map()
  for (const e of [...S.sent.flatMap(b => b.events), ...S.queue]) addEvent(e)
  if (S.queue.length || S.sent.some(b => b.pending)) schedule(S) // left over from an earlier run
}

const addEvent = e => {
  const k = e.path.toLowerCase()
  if (!S.byPath.has(k)) S.byPath.set(k, [])
  S.byPath.get(k).push(e)
}

// Key of node in the export, undefined for files the PC has not exported: the PC drops their events, so they get no score.
const exportKey = node => {
  const path = S && relPath(node, S.lib.root)
  return path == null ? undefined : S.keys.get(path.toLowerCase())
}

export const title = node => {
  const key = exportKey(node)
  return (key != null && S.lib.export.items[key].title) || stem(node.name)
}

export function item(node) {
  const key = exportKey(node)
  if (key == null) return null
  let it = cache.get(node)
  if (!it) {
    it = applyEvents({ [key]: S.lib.export.items[key] }, S.byPath.get(key.toLowerCase()) ?? [])[key]
    cache.set(node, it)
  }
  return it
}

export function record(node, kind, value) {
  const s = S, key = exportKey(node)
  if (key == null) return
  const e = { path: relPath(node, s.lib.root), kind, at: Date.now() / 1000 }
  if (kind !== 'view') {
    if (!Number.isFinite(value)) return
    const [lo, hi] = kind === 'rate' ? [1, 5] : [1, 100]
    e.value = Math.min(hi, Math.max(lo, Math.round(value)))
  }
  s.queue.push(e)
  addEvent(e)
  write(s.qKey, s.queue)
  cache.delete(node)
  schedule(s)
  listener?.(node)
}

const schedule = s => { clearTimeout(s.timer); s.timer = setTimeout(flush, FLUSH_DELAY) }

// Uploads the queue as one change file. The batch (with its name) is stored before the network call, so a retry after
// a crash or a failed-looking upload reuses the name instead of sending the events twice; on failure it is retried later.
export async function flush() {
  const s = S
  if (!s || s.busy) return
  let batch = s.sent.find(b => b.pending)
  if (!batch) {
    if (!s.queue.length) return
    batch = { name: newChangeName(), events: s.queue, pending: true }
    s.sent.push(batch)
    s.queue = []
    write(s.sKey, s.sent)
    write(s.qKey, s.queue)
  }
  clearTimeout(s.timer)
  s.busy = true
  const gen = epoch()
  try {
    if (!changeNames(s.lib.dataDir).has(batch.name)) await uploadChanges(s.lib.dataDir, batch.events, batch.name)
    if (gen !== epoch()) return // logged out meanwhile: the stored data is gone
    delete batch.pending
    write(s.sKey, s.sent)
  } catch (e) {
    console.warn('uploading changes failed', e)
  } finally {
    s.busy = false
    if (S === s && (s.queue.length || batch.pending)) schedule(s)
  }
}

document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush() })
addEventListener('pagehide', flush)
