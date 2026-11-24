import { login, restoreSession, logout, getFile, cachedThumb, makeThumb, upload } from './mega.js'
import { mediaKind, collectMedia, findFolder, sortEntries } from './logic.js'

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
  } catch {
    show('s-offline')
    return
  }
  state.storage ? afterLogin() : show('s-login')
}

function afterLogin() {
  const name = store.get('mv-folder')
  if (name) openFolder(name)
  else show('s-folder')
}

function openFolder(name) {
  const folder = findFolder(Object.values(state.storage.files), name)
  if (!folder) {
    $('folder-msg').textContent = `Ordner „${name}“ nicht gefunden.`
    show('s-folder')
    return
  }
  store.set('mv-folder', name)
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
    setThumb(tile, await makeThumb(node, await getFile(node)))
  } catch {
    placeholder(tile, '⚠')
  }
}

function renderGrid() {
  observer.disconnect()
  queue.length = 0
  thumbUrls.forEach(URL.revokeObjectURL)
  thumbUrls = []
  state.entries = sortEntries(collectMedia(state.folder), store.get('mv-sort') || 'date')
  $('sort').textContent = (store.get('mv-sort') || 'date') === 'date' ? 'Neueste' : 'Name'
  const empty = !state.entries.length
  $('lib-msg').hidden = $('change-folder').hidden = !empty
  $('lib-msg').textContent = empty ? 'Keine Bilder oder Videos in diesem Ordner.' : ''
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
  for (const [i, f] of ok.entries()) {
    msg.textContent = `Lade hoch ${i + 1}/${ok.length} …`
    prog.value = 0
    try {
      await upload(state.folder, f, (l, t) => { prog.value = t ? l / t : 0 })
    } catch {
      failed.push(f.name)
    }
  }
  prog.hidden = true
  $('upload').disabled = false
  const parts = []
  if (skipped.length) parts.push(`Übersprungen (Format kennt MediaVault nicht): ${skipped.join(', ')}`)
  if (failed.length) parts.push(`Fehlgeschlagen: ${failed.join(', ')}`)
  msg.textContent = parts.join('. ')
  msg.hidden = !parts.length
  renderGrid()
}

// ---- viewer ----
let current = -1
let viewUrl = null
let token = 0

function clearMedia() {
  $('vmedia').replaceChildren()
  if (viewUrl) URL.revokeObjectURL(viewUrl)
  viewUrl = null
}

async function openViewer(i) {
  if (i < 0 || i >= state.entries.length) return
  current = i
  const me = ++token
  const node = state.entries[i]
  clearMedia()
  $('viewer').hidden = false
  $('vmsg').hidden = true
  $('vprog').hidden = false
  $('vprog').value = 0
  try {
    const blob = await getFile(node, (l, t) => { if (me === token) $('vprog').value = t ? l / t : 0 })
    if (me !== token) return
    viewUrl = URL.createObjectURL(blob)
    let el
    if (mediaKind(node.name) === 'video') {
      el = document.createElement('video')
      el.controls = true
      el.playsInline = true
    } else {
      el = new Image()
      el.alt = node.name
    }
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
  } catch {
    if (me !== token) return
    $('vprog').hidden = true
    $('vmsg').textContent = 'Konnte die Datei nicht laden.'
    $('vmsg').hidden = false
  }
}

function closeViewer() {
  token++
  clearMedia()
  $('viewer').hidden = true
}

$('close').onclick = closeViewer
let touch = null
$('viewer').addEventListener('touchstart', e => { touch = e.target.closest('video') ? null : e.changedTouches[0] }, { passive: true })
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
$('login-form').onsubmit = async e => {
  e.preventDefault()
  $('login-msg').textContent = ''
  try {
    state.storage = await login($('email').value.trim(), $('password').value, $('code').value.trim())
    $('password').value = ''
    afterLogin()
  } catch (err) {
    $('login-msg').textContent = err.message || String(err)
  }
}
$('folder-form').onsubmit = e => {
  e.preventDefault()
  $('folder-msg').textContent = ''
  openFolder($('folder-name').value)
}
$('change-folder').onclick = () => { $('folder-msg').textContent = ''; show('s-folder') }
$('sort').onclick = () => {
  store.set('mv-sort', (store.get('mv-sort') || 'date') === 'date' ? 'name' : 'date')
  renderGrid()
}
$('logout').onclick = async () => {
  if (!confirm('Abmelden und alle gespeicherten Dateien auf diesem Gerät löschen?')) return
  try { await logout() } catch (e) { console.warn('logout failed', e) }
  state.storage = state.folder = null
  show('s-login')
}

start()
