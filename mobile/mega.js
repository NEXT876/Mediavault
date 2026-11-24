import { Storage } from 'https://cdn.jsdelivr.net/npm/megajs@1.3.9/dist/main.browser-es.mjs'
import { DATA_DIR, UPLOAD_FOLDER, mediaKind, mimeType, uniqueName } from './logic.js'

const THUMB_EDGE = 300
let persisted = false
let generation = 0 // bumped by logout(): in-flight cache writes of an older generation are dropped

function persistOnce() {
  if (persisted) return
  persisted = true
  navigator.storage?.persist?.().catch(() => {})
}

export async function login(email, password, code) {
  const storage = await new Storage({ email, password, secondFactorCode: code || undefined }).ready
  localStorage.setItem('mv-session', JSON.stringify({ ...storage.toJSON(), options: { email } }))
  persistOnce()
  return storage
}

export async function restoreSession() {
  const raw = localStorage.getItem('mv-session')
  if (!raw) return null
  try {
    const storage = Storage.fromJSON(JSON.parse(raw))
    await storage.reload(true)
    persistOnce()
    return storage
  } catch (e) {
    // megajs errors are plain Errors with the code in the message; only a dead session is dropped,
    // everything else (offline, EAGAIN, ...) keeps it and lets the UI show the retry screen
    if (/ESID|EACCESS/.test(e?.message)) {
      localStorage.removeItem('mv-session')
      return null
    }
    throw e
  }
}

export const epoch = () => generation // lets callers notice a logout between two steps

export async function logout() {
  generation++
  for (const k of ['mv-session', 'mv-folder', 'mv-sort']) localStorage.removeItem(k)
  for (const k of Object.keys(localStorage)) if (/^mv-(queue|sent):/.test(k)) localStorage.removeItem(k)
  await caches.delete('mv-files')
  await caches.delete('mv-thumbs')
}

async function cacheGet(cacheName, key) {
  const hit = await (await caches.open(cacheName)).match(key)
  return hit ? hit.blob() : null
}

async function cachePut(cacheName, key, blob, gen) {
  if (gen !== generation) return
  try { // caching is only an optimization (iOS may throw QuotaExceededError)
    const cache = await caches.open(cacheName)
    if (gen !== generation) return
    await cache.put(key, new Response(blob, { headers: { 'Content-Type': blob.type } }))
  } catch (e) {
    console.warn('cache write failed', e)
  }
}

// shortcut: whole video is held in memory; stream via partial downloads only if big videos cause trouble.
export async function getFile(node, onProgress, signal) {
  const gen = generation
  const key = './f/' + node.nodeId
  const cached = await cacheGet('mv-files', key)
  if (cached) return cached
  const aborted = () => new DOMException('Aborted', 'AbortError')
  if (signal?.aborted) throw aborted()
  const blob = await new Promise((resolve, reject) => {
    const chunks = []
    const stream = node.download({})
    signal?.addEventListener('abort', () => { stream.destroy?.(); reject(aborted()) }, { once: true })
    stream.on('data', c => chunks.push(c))
    stream.on('progress', p => onProgress?.(p.bytesLoaded, p.bytesTotal))
    stream.on('error', reject)
    stream.on('end', () => resolve(new Blob(chunks, { type: mimeType(node.name) })))
  })
  await cachePut('mv-files', key, blob, gen)
  return blob
}

export const cachedThumb = node => cacheGet('mv-thumbs', './t/' + node.nodeId)

async function drawable(node, blob) {
  if (mediaKind(node.name) === 'image') {
    const bmp = await createImageBitmap(blob)
    return { source: bmp, w: bmp.width, h: bmp.height, done: () => bmp.close?.() }
  }
  const url = URL.createObjectURL(blob)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  let timer
  try {
    await new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error('video thumbnail timeout')), 10000)
      video.onerror = () => reject(new Error('video load failed'))
      // iOS decodes no frame of a never-played video, so the canvas stays black: play (muted) once, then seek
      video.onloadedmetadata = () => video.play().catch(() => {}).then(() => {
        video.pause()
        try {
          video.currentTime = Number.isFinite(video.duration) ? Math.min(2, video.duration / 2) : 0
        } catch (e) { reject(e) }
      })
      video.onseeked = resolve
      video.src = url
    })
    if (!video.videoWidth || !video.videoHeight) throw new Error('video has no frame')
  } catch (e) {
    URL.revokeObjectURL(url)
    throw e
  } finally {
    clearTimeout(timer)
  }
  return { source: video, w: video.videoWidth, h: video.videoHeight, done: () => URL.revokeObjectURL(url) }
}

export async function makeThumb(node, blob) {
  const gen = generation
  const d = await drawable(node, blob)
  try {
    const scale = Math.min(1, THUMB_EDGE / Math.max(d.w, d.h))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(d.w * scale))
    canvas.height = Math.max(1, Math.round(d.h * scale))
    canvas.getContext('2d').drawImage(d.source, 0, 0, canvas.width, canvas.height)
    const thumb = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.8))
    if (!thumb) throw new Error('thumbnail encoding failed')
    await cachePut('mv-thumbs', './t/' + node.nodeId, thumb, gen)
    return thumb
  } finally {
    d.done()
  }
}

export async function upload(folder, file, onProgress) {
  const gen = generation
  const children = folder.children ?? []
  const target = children.find(n => n.directory && n.name === UPLOAD_FOLDER) ?? await folder.mkdir(UPLOAD_FOLDER)
  const taken = new Set((target.children ?? []).map(n => n.name.toLowerCase()))
  const name = uniqueName(file.name, taken)
  // shortcut: the whole file is read into memory (~2x its size); stream the upload only if large videos crash.
  const up = target.upload({ name, size: file.size }, new Uint8Array(await file.arrayBuffer()))
  up.on?.('progress', p => onProgress?.(p.bytesUploaded, p.bytesTotal))
  // a failed transfer emits 'error' on the stream; without a listener it would throw and never settle up.complete
  const node = await new Promise((res, rej) => { up.on?.('error', rej); up.complete.then(res, rej) })
  await cachePut('mv-files', './f/' + node.nodeId, new Blob([file], { type: mimeType(name) }), gen)
  await makeThumb(node, file).catch(() => {}) // a failed thumbnail must not fail a finished upload
  return node
}

const CHANGES_DIR = 'changes'
const childDir = (node, name) => node.children?.find(n => n.directory && n.name === name)

// Nearest of folder and its ancestors with _MediaVault/phone.json (newest one if MEGA kept duplicates).
export function findLibrary(folder) {
  for (let root = folder; root; root = root.parent) {
    const dataDir = childDir(root, DATA_DIR)
    const exportNode = (dataDir?.children ?? [])
      .filter(n => !n.directory && n.name === 'phone.json')
      .sort((a, b) => b.timestamp - a.timestamp)[0]
    if (exportNode) return { root, dataDir, exportNode }
  }
  return null
}

export async function loadExport(exportNode) {
  try {
    return JSON.parse(new TextDecoder().decode(await exportNode.downloadBuffer({})))
  } catch {
    return null
  }
}

export const changeNames = dataDir => new Set((childDir(dataDir, CHANGES_DIR)?.children ?? []).map(n => n.name))

export function newChangeName() {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(4)), b => b.toString(16).padStart(2, '0')).join('')
  return `${Date.now()}-${hex}.json`
}

// Writes a change file the PC applies later; returns its name. The caller reserves `name` first so a retry reuses it.
export async function uploadChanges(dataDir, events, name = newChangeName()) {
  const dir = childDir(dataDir, CHANGES_DIR) ?? await dataDir.mkdir(CHANGES_DIR)
  const body = new TextEncoder().encode(JSON.stringify({ version: 1, events: events.map(e => ({ ...e, at: Math.round(e.at * 1000) / 1000 })) }))
  const up = dir.upload({ name, size: body.length }, body)
  await new Promise((res, rej) => { up.on?.('error', rej); up.complete.then(res, rej) })
  return name
}
