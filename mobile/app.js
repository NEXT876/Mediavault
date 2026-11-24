import { login, restoreSession, logout, getFile, cachedThumb, makeThumb, upload, epoch } from './mega.js'
import { mediaKind, collectMedia, listFolders, sortEntries, isNetworkError } from './logic.js'

const $ = id => document.getElementById(id)
const store = {
  get: k => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k, v) => { try { localStorage.setItem(k, v) } catch {} },
}
// Task 4 relies on: state.storage, state.folder, state.entries, renderGrid()
const state = { storage: null, folder: null, entries: [], tiles: new Map() }
let thumbUrls = []

function show(id) {
  for (const s of ['s-start', 's-offline', 's-login', 's-folder', 's-lib']) $(s).hidden = s !== id
}

async function start() {
  show('s-start')
  try {
    state.storage = await restoreSession()
  } catch (err) {
    $('offline-msg').textContent = isNetworkError(err) ? '' : `Fehler: ${err?.message || err}`
    show('s-offline')
    return
  }
  state.storage ? afterLogin() : show('s-login')
}

function afterLogin() {
  const saved = state.storage.files[store.get('mv-folder')]
  saved?.directory ? openFolder(saved) : showFolders()
}

// Any MEGA folder can be opened, with or without a MediaVault config behind it.
function showFolders() {
  const root = state.storage.root
  const items = [{ node: root, path: 'Alles (Cloud Drive)', count: collectMedia(root).length }, ...listFolders(root)]
  $('folder-list').replaceChildren(...items.map(({ node, path, count }) => {
    const b = document.createElement('button')
    b.className = 'folder'
    b.append(path, Object.assign(document.createElement('span'), { textContent: `${count} Dateien` }))
    b.onclick = () => openFolder(node)
    return b
  }))
  show('s-folder')
}

function openFolder(folder) {
  store.set('mv-folder', folder.nodeId)
  state.folder = folder
  show('s-lib')
  renderGrid()
}

// ---- grid ----
const observer = new IntersectionObserver(items => {
  for (const it of items) {
    if (!it.isIntersecting) continue
    observer.unobserve(it.target)
    queue.push(it.target)
  }
  pump()
}, { rootMargin: '200px' })
const queue = []
let running = 0

function pump() {
  while (running < 2 && queue.length) {
    const tile = queue.shift()
    running++
    loadTile(tile).finally(() => { running--; pump() })
  }
}

function setThumb(tile, blob) {
  const url = URL.createObjectURL(blob)
  thumbUrls.push(url)
  const img = new Image()
  img.alt = tile.node.name
  img.src = url
  tile.replaceChildren(img)
}

function placeholder(tile, symbol) {
  tile.innerHTML = ''
  const ph = document.createElement('div')
  ph.className = 'ph'
  const b = document.createElement('b')
  b.textContent = symbol
  ph.append(b, tile.node.name)
  tile.append(ph)
}

async function loadTile(tile) {
  const node = tile.node
  try {
    const cached = await cachedThumb(node)
    if (cached) return setThumb(tile, cached)
    if (mediaKind(node.name) === 'video') return placeholder(tile, '▶')
    const e = epoch()
    const blob = await getFile(node)
    if (e !== epoch()) return // logged out meanwhile: do not refill the caches
    setThumb(tile, await makeThumb(node, blob))
  } catch {
    placeholder(tile, '⚠')
  }
}

function renderGrid() {
  observer.disconnect()
  queue.length = 0
  thumbUrls.forEach(URL.revokeObjectURL)
  thumbUrls = []
  // two tabs like the desktop app: images and videos are never mixed in one grid
  const all = collectMedia(state.folder)
  const tab = store.get('mv-tab') === 'video' ? 'video' : 'image'
  for (const k of ['image', 'video']) {
    $('tab-' + k).textContent = `${k === 'image' ? 'Bilder' : 'Videos'} (${all.filter(n => mediaKind(n.name) === k).length})`
    $('tab-' + k).setAttribute('aria-selected', String(k === tab))
  }
  state.entries = sortEntries(all.filter(n => mediaKind(n.name) === tab), store.get('mv-sort') || 'date')
  $('sort').textContent = (store.get('mv-sort') || 'date') === 'date' ? 'Neueste' : 'Name'
  $('lib-msg').hidden = state.entries.length > 0
  $('lib-msg').textContent = `Keine ${tab === 'image' ? 'Bilder' : 'Videos'} in diesem Ordner.`
  state.tiles = new Map()
  $('grid').replaceChildren(...state.entries.map((node, i) => {
    const tile = document.createElement('button')
    tile.className = 'tile'
    tile.node = node
    tile.setAttribute('aria-label', node.name)
    tile.onclick = () => openViewer(i)
    state.tiles.set(node, tile)
    observer.observe(tile)
    return tile
  }))
}

// ---- upload ----
$('upload').onclick = () => $('pick').click()
$('pick').onchange = async () => {
  const files = [...$('pick').files]
  $('pick').value = ''
  if (!files.length) return
  const ok = files.filter(f => mediaKind(f.name))
  const skipped = files.filter(f => !mediaKind(f.name)).map(f => f.name)
  const failed = []
  const msg = $('up-msg'), prog = $('uprog')
  $('upload').disabled = true
  msg.hidden = prog.hidden = false
  try {
    for (const [i, f] of ok.entries()) {
      msg.textContent = `Lade hoch ${i + 1}/${ok.length} …`
      prog.value = 0
      try {
        await upload(state.folder, f, (l, t) => { prog.value = t ? l / t : 0 })
      } catch (e) {
        console.error(f.name, e)
        failed.push(f.name)
      }
    }
  } finally {
    prog.hidden = true
    $('upload').disabled = false
  }
  const parts = []
  if (skipped.length) parts.push(`Übersprungen (Format kennt MediaVault nicht): ${skipped.join(', ')}`)
  if (failed.length) parts.push(`Fehlgeschlagen: ${failed.join(', ')}`)
  msg.textContent = parts.join('. ')
  msg.hidden = !parts.length
  msg.style.color = failed.length ? 'var(--bad)' : ''
  renderGrid()
}

// ---- viewer ----
let current = -1
let viewUrl = null
let token = 0
let ctrl = null // aborts the download of the item the viewer left

function clearMedia() {
  $('vmedia').replaceChildren()
  if (viewUrl) URL.revokeObjectURL(viewUrl)
  viewUrl = null
}

async function openViewer(i) {
  if (i < 0 || i >= state.entries.length) return
  current = i
  const me = ++token
  ctrl?.abort()
  ctrl = new AbortController()
  const node = state.entries[i]
  clearMedia()
  $('viewer').hidden = false
  $('vmsg').hidden = true
  chrome(true)
  $('vbar').hidden = mediaKind(node.name) !== 'video'
  $('vseek').value = 0
  $('vtime').textContent = $('vdur').textContent = '0:00'
  $('vprog').hidden = false
  $('vprog').value = 0
  try {
    const blob = await getFile(node, (l, t) => { if (me === token) $('vprog').value = t ? l / t : 0 }, ctrl.signal)
    if (me !== token) return
    viewUrl = URL.createObjectURL(blob)
    let el
    if (mediaKind(node.name) === 'video') {
      el = document.createElement('video')
      el.playsInline = true // own control bar (#vbar) instead of the iOS one
      el.loop = store.get('mv-loop') === '1' // native loop restarts without a gap
      el.onplay = el.onpause = () => { chrome(true); syncBar() }
      el.ontimeupdate = syncBar
      el.preload = 'auto'
      el.onerror = () => { if (!el.isConnected) return; $('vmsg').textContent = 'Dieses Format kann das iPhone nicht abspielen.'; $('vmsg').hidden = false }
    } else {
      el = new Image()
      el.alt = node.name
    }
    // a tiny seek makes iOS paint the first frame instead of a black box before play is tapped
    // (a '#t=' fragment on the blob URL breaks loading in Safari)
    if (el.tagName === 'VIDEO') el.onloadedmetadata = () => { el.currentTime = 0.001; syncBar() }
    el.src = viewUrl
    $('vmedia').replaceChildren(el)
    $('vprog').hidden = true
    if (el.tagName === 'VIDEO') {
      try { // a failing thumbnail must not hide the shown video
        if (!(await cachedThumb(node))) {
          const t = await makeThumb(node, blob)
          if (state.tiles.get(node)?.isConnected) setThumb(state.tiles.get(node), t)
        }
      } catch {}
    }
  } catch (e) {
    if (me !== token || e?.name === 'AbortError') return
    $('vprog').hidden = true
    $('vmsg').textContent = 'Konnte die Datei nicht laden.'
    $('vmsg').hidden = false
  }
}

function closeViewer() {
  token++
  ctrl?.abort()
  clearMedia()
  $('viewer').hidden = true
}

// ---- video bar ----
const video = () => $('vmedia').querySelector('video')
const fmt = t => Number.isFinite(t) ? `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}` : '0:00'
let scrubbing = false
function syncBar() {
  const v = video()
  if (!v) return
  $('vplay').textContent = v.paused ? '▶\uFE0E' : '❚❚'
  $('vplay').setAttribute('aria-label', v.paused ? 'Abspielen' : 'Pause')
  $('vtime').textContent = fmt(v.currentTime)
  $('vdur').textContent = fmt(v.duration)
  if (!scrubbing) $('vseek').value = v.duration ? Math.round(v.currentTime / v.duration * 1000) : 0
  $('vseek').style.setProperty('--p', $('vseek').value / 10 + '%')
}
$('vplay').onclick = () => { const v = video(); if (v) v.paused ? v.play().catch(() => {}) : v.pause() }
const skip = d => { const v = video(); if (v?.duration) v.currentTime = Math.min(Math.max(0, v.currentTime + d), v.duration) }
$('vback').onclick = () => skip(-10)
$('vfwd').onclick = () => skip(10)
$('vseek').oninput = () => {
  const v = video()
  scrubbing = true
  if (v?.duration) v.currentTime = $('vseek').value / 1000 * v.duration
  chrome(true)
  syncBar()
}
$('vseek').onchange = () => { scrubbing = false }

// Close button and video bar hide 3 s into playback; a tap on the video toggles them, paused keeps them shown.
let idleTimer
function chrome(show) {
  clearTimeout(idleTimer)
  $('viewer').classList.toggle('idle', !show)
  const v = $('vmedia').querySelector('video')
  if (show && v && !v.paused) idleTimer = setTimeout(() => $('viewer').classList.add('idle'), 3000)
}
let tap
$('viewer').addEventListener('touchstart', e => { tap = e.changedTouches[0] }, { passive: true })
$('viewer').addEventListener('touchend', e => {
  const s = tap, t = e.changedTouches[0]
  tap = null
  if (!s || !video()) return
  if (e.target.closest('#vbar')) return chrome(true) // using the bar keeps it shown
  if (e.target.closest('button') || Math.hypot(t.clientX - s.clientX, t.clientY - s.clientY) > 10) return
  chrome($('viewer').classList.contains('idle'))
}, { passive: true })
$('close').onclick = closeViewer
const showLoop = () => $('loop').setAttribute('aria-pressed', String(store.get('mv-loop') === '1'))
$('loop').onclick = () => {
  store.set('mv-loop', store.get('mv-loop') === '1' ? '0' : '1')
  showLoop()
  const v = $('vmedia').querySelector('video')
  if (v) v.loop = store.get('mv-loop') === '1'
}
showLoop()
let touch = null
$('viewer').addEventListener('touchstart', e => { touch = e.target.closest('#vbar') ? null : e.changedTouches[0] }, { passive: true })
$('viewer').addEventListener('touchend', e => {
  if (!touch) return
  const dx = e.changedTouches[0].clientX - touch.clientX
  const dy = e.changedTouches[0].clientY - touch.clientY
  touch = null
  if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy)) openViewer(current + (dx < 0 ? 1 : -1))
}, { passive: true })
document.addEventListener('keydown', e => {
  if ($('viewer').hidden) return
  if (e.key === 'ArrowRight') openViewer(current + 1)
  else if (e.key === 'ArrowLeft') openViewer(current - 1)
  else if (e.key === 'Escape') closeViewer()
})

// ---- forms and buttons ----
$('retry').onclick = start
function loginError(err) {
  const m = err?.message || String(err)
  if (isNetworkError(err)) return 'Keine Verbindung.'
  if (/ENOENT|EKEY|invalid/i.test(m)) return 'E-Mail oder Passwort falsch.'
  if (/EMFAREQUIRED/.test(m)) return 'Bitte 2FA-Code eingeben.'
  return m
}
$('show-pw').onchange = e => { $('password').type = e.target.checked ? 'text' : 'password' }
$('login-form').onsubmit = async e => {
  e.preventDefault()
  $('login-msg').textContent = ''
  const btn = $('login-form').querySelector('button')
  btn.disabled = true
  try {
    state.storage = await login($('email').value.trim(), $('password').value, $('code').value.trim())
    $('password').value = ''
    afterLogin()
  } catch (err) {
    $('login-msg').textContent = loginError(err)
  } finally {
    btn.disabled = false
  }
}
$('change-folder').onclick = showFolders
for (const k of ['image', 'video']) $('tab-' + k).onclick = () => { store.set('mv-tab', k); renderGrid(); scrollTo(0, 0) }
$('sort').onclick = () => {
  store.set('mv-sort', (store.get('mv-sort') || 'date') === 'date' ? 'name' : 'date')
  renderGrid()
}
async function doLogout() {
  if (!confirm('Abmelden und alle gespeicherten Dateien auf diesem Gerät löschen?')) return
  // stop work that would refill the caches
  queue.length = 0
  observer.disconnect()
  ctrl?.abort()
  try { await state.storage?.close?.() } catch {}
  try { await logout() } catch (e) { console.warn('logout failed', e) }
  state.storage = state.folder = null
  show('s-login')
}
$('logout').onclick = $('offline-logout').onclick = doLogout
start()
