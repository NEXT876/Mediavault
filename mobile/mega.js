import { Storage } from 'https://cdn.jsdelivr.net/npm/megajs@1.3.9/dist/main.browser-es.mjs'
import { UPLOAD_FOLDER, mediaKind, mimeType, uniqueName } from './logic.js'

const THUMB_EDGE = 300
let persisted = false

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
  } catch {
    localStorage.removeItem('mv-session')
    return null
  }
}

export async function logout() {
  for (const k of ['mv-session', 'mv-folder', 'mv-sort']) localStorage.removeItem(k)
  await caches.delete('mv-files')
  await caches.delete('mv-thumbs')
}

async function cacheGet(cacheName, key) {
  const hit = await (await caches.open(cacheName)).match(key)
  return hit ? hit.blob() : null
}

async function cachePut(cacheName, key, blob) {
  await (await caches.open(cacheName)).put(key, new Response(blob, { headers: { 'Content-Type': blob.type } }))
}

// shortcut: whole video is held in memory; stream via partial downloads only if big videos cause trouble.
export async function getFile(node, onProgress) {
  const key = './f/' + node.nodeId
  const cached = await cacheGet('mv-files', key)
  if (cached) return cached
  const blob = await new Promise((resolve, reject) => {
    const chunks = []
    const stream = node.download({})
    stream.on('data', c => chunks.push(c))
    stream.on('progress', p => onProgress?.(p.bytesLoaded, p.bytesTotal))
    stream.on('error', reject)
    stream.on('end', () => resolve(new Blob(chunks, { type: mimeType(node.name) })))
  })
  await cachePut('mv-files', key, blob)
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
  try {
    await new Promise((resolve, reject) => {
      video.onerror = () => reject(new Error('video load failed'))
      video.onloadedmetadata = () => { video.currentTime = Math.min(2, video.duration / 2) }
      video.onseeked = resolve
      video.src = url
    })
  } catch (e) {
    URL.revokeObjectURL(url)
    throw e
  }
  return { source: video, w: video.videoWidth, h: video.videoHeight, done: () => URL.revokeObjectURL(url) }
}

export async function makeThumb(node, blob) {
  const d = await drawable(node, blob)
  try {
    const scale = Math.min(1, THUMB_EDGE / Math.max(d.w, d.h))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(d.w * scale))
    canvas.height = Math.max(1, Math.round(d.h * scale))
    canvas.getContext('2d').drawImage(d.source, 0, 0, canvas.width, canvas.height)
    const thumb = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.8))
    await cachePut('mv-thumbs', './t/' + node.nodeId, thumb)
    return thumb
  } finally {
    d.done()
  }
}

export async function upload(folder, file, onProgress) {
  const children = folder.children ?? []
  const target = children.find(n => n.directory && n.name === UPLOAD_FOLDER) ?? await folder.mkdir(UPLOAD_FOLDER)
  const taken = new Set((target.children ?? []).map(n => n.name.toLowerCase()))
  const name = uniqueName(file.name, taken)
  const up = target.upload({ name, size: file.size }, new Uint8Array(await file.arrayBuffer()))
  up.on?.('progress', p => onProgress?.(p.bytesLoaded, p.bytesTotal))
  const node = await up.complete
  await cachePut('mv-files', './f/' + node.nodeId, new Blob([file], { type: mimeType(name) }))
  await makeThumb(node, file).catch(() => {}) // a failed thumbnail must not fail a finished upload
  return node
}
