import { login, restoreSession, logout, getFile, cachedThumb, makeThumb, upload, epoch, findLibrary, loadExport } from './mega.js'
import { mediaKind, collectMedia, listFolders, sortEntries, isNetworkError, scoreTier } from './logic.js'
import * as scores from './scores.js'
import { showRating, render as renderRating } from './rating.js'
import * as random from './random.js'
import { chooseGroups } from './sheet.js'
import { initWheel } from './wheel.js'

const $ = id => document.getElementById(id)
const store = {
  get: k => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k, v) => { try { localStorage.setItem(k, v) } catch {} },
}
// state.lib: undefined while loading, null without MediaVault data, else { root, dataDir, export }
const state = { storage: null, folder: null, lib: null, page: 'image', entries: [], tiles: new Map() }
let thumbUrls = []

// ---- theme (palettes live in index.html) ----
const THEMES = { dark: 'Dunkel', light: 'Hell', neon: 'Neon' }
function applyTheme(name) {
  const theme = Object.hasOwn(THEMES, name) ? name : 'dark'
  document.documentElement.dataset.theme = theme
  store.set('mv-theme', theme) // the next start shows it before the export is loaded
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
  document.querySelector('meta[name="theme-color"]').content = bg
}
applyTheme(store.get('mv-theme'))

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
    b.className = 'btn folder'
    b.append(path, Object.assign(document.createElement('span'), { textContent: `${count} Dateien` }))
    b.onclick = () => openFolder(node)
    return b
  }))
  show('s-folder')
}

function openFolder(folder) {
  store.set('mv-folder', folder.nodeId)
  state.folder = folder
  state.lib = undefined
  scores.flush() // the old library's queue (a no-op without one)
  scores.activate(null)
  random.reset()
  renderMore(); wheel.refresh()
  for (const e of document.querySelectorAll('.fname')) e.textContent = folder === state.storage.root ? 'Alles (Cloud Drive)' : folder.name
  show('s-lib')
  showPage(store.get('mv-tab') === 'video' ? 'video' : 'image', true)
  loadLibrary(folder) // after the grid: the export never blocks it
}

async function loadLibrary(folder) {
  let found = null, data = null
  try {
    found = findLibrary(folder)
    data = found && await loadExport(found.exportNode)
  } catch (e) {
    console.warn('library data lookup failed', e)
    if (folder === state.folder) { state.lib = null; renderMore(); wheel.refresh() }
    return
  }
  if (folder !== state.folder) return // another folder or a logout in the meantime
  state.lib = found && { root: found.root, dataDir: found.dataDir, export: data }
  // a data folder whose export failed to load (offline) keeps the remembered theme
  if (!found || data) applyTheme(data?.theme)
  scores.activate(state.lib)
  state.tiles.forEach(refreshTile)
  renderMore(); wheel.refresh()
}

// ---- navigation: one markup, bottom tab bar on phones, sidebar on iPad ----
const VIEWS = { image: 'library', video: 'library', random: 'random', wheel: 'wheel', more: 'more' }
function showPage(page, force) {
  if (page === state.page && !force) return
  state.page = page
  if (VIEWS[page] === 'library') store.set('mv-tab', page)
  for (const v of document.querySelectorAll('[data-view]')) v.hidden = v.dataset.view !== VIEWS[page]
  for (const b of document.querySelectorAll('#nav [data-page]')) {
    if (b.dataset.page === page) b.setAttribute('aria-current', 'page')
    else b.removeAttribute('aria-current')
  }
  if (VIEWS[page] === 'library') renderGrid()
  if (page === 'wheel') wheel.refresh()
  scrollTo(0, 0)
}

let toastTimer
function toast(text) {
  $('toast').textContent = text
  $('toast').hidden = false
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { $('toast').hidden = true }, 3500)
}

const wheel = initWheel({ getExport: () => state.lib?.export, toast })

// mode: normal|smart (the page type, as last shown), all|allsmart (images and videos), groups (sheet)
async function startRandom(mode) {
  let spec = { kinds: mode.startsWith('all') ? ['image', 'video'] : [store.get('mv-tab') === 'video' ? 'video' : 'image'], smart: mode.endsWith('smart') }
  if (mode === 'groups') {
    const r = await chooseGroups({
      title: 'Gruppen-Zufall', groups: state.lib?.export?.groups ?? [], types: true,
      actions: [{ id: 'normal', label: '🎲 Normal' }, { id: 'smart', label: '⚖️ Smart', primary: true }],
    })
    if (!r) return
    spec = { kinds: r.types, groups: r.groups, smart: r.action === 'smart' }
  }
  const node = random.begin(state.folder, spec)
  if (node) openNode(node)
  else toast('Keine passenden Einträge.')
}

function renderMore() {
  $('more-info').textContent = state.lib === undefined ? 'Wird geladen …'
    : state.lib?.export ? `Mit MediaVault verbunden · Theme vom PC: ${THEMES[document.documentElement.dataset.theme]}`
    : state.lib ? 'MediaVault-Daten konnten nicht geladen werden. Ordner neu öffnen, um es erneut zu versuchen.'
    : 'Dieser Ordner gehört zu keiner MediaVault-Config. Score, Smart-Zufall und Gruppen sind hier aus.'
}

$('s-lib').onclick = e => {
  const { page, action, random } = e.target.closest('[data-page], [data-action], [data-random]')?.dataset ?? {}
  if (page) showPage(page)
  else if (random) startRandom(random)
  else if (action === 'upload') $('pick').click()
  else if (action === 'folder') showFolders()
  else if (action === 'logout') doLogout()
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
  tile.thumb.replaceChildren(img)
}

function placeholder(tile, symbol) {
  const ph = document.createElement('div')
  ph.className = 'ph'
  const b = document.createElement('b')
  b.textContent = symbol
  const t = document.createElement('span')
  t.className = 'pt'
  ph.append(b, t)
  tile.thumb.replaceChildren(ph)
  refreshTile(tile)
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

// title, score badge and group of a tile (without MediaVault data: file name only)
function refreshTile(tile) {
  const title = scores.title(tile.node), it = scores.item(tile.node)
  tile.ttl.textContent = title
  tile.thumb.querySelector('.pt')?.replaceChildren(title)
  tile.badge.hidden = !it
  if (it) {
    tile.badge.textContent = it.score
    tile.badge.dataset.tier = scoreTier(it.score)
  }
  tile.grp.textContent = it?.group ?? ''
}
scores.onChange(node => {
  const tile = state.tiles.get(node)
  if (tile) refreshTile(tile)
  renderRating()
})

function renderGrid() {
  observer.disconnect()
  queue.length = 0
  thumbUrls.forEach(URL.revokeObjectURL)
  thumbUrls = []
  // images and videos are never mixed in one grid, like the desktop app
  const tab = store.get('mv-tab') === 'video' ? 'video' : 'image'
  const sort = store.get('mv-sort') === 'name' ? 'name' : 'date'
  state.entries = sortEntries(collectMedia(state.folder).filter(n => mediaKind(n.name) === tab), sort)
  $('lib-title').textContent = tab === 'image' ? '🖼️ Bilder' : '🎬 Videos'
  $('lib-count').textContent = state.entries.length
  $('sort').value = sort
  $('lib-msg').hidden = state.entries.length > 0
  $('lib-msg').textContent = `Keine ${tab === 'image' ? 'Bilder' : 'Videos'} in diesem Ordner.`
  state.tiles = new Map()
  $('grid').replaceChildren(...state.entries.map((node, i) => {
    const tile = document.createElement('button')
    tile.className = 'tile'
    tile.node = node
    tile.setAttribute('aria-label', node.name)
    const part = (cls, tag = 'span') => Object.assign(document.createElement(tag), { className: cls })
    tile.thumb = part('thumb')
    tile.ttl = part('ttl')
    tile.badge = part('badge')
    tile.grp = part('grp')
    tile.append(tile.thumb, tile.ttl, tile.badge, tile.grp)
    refreshTile(tile)
    tile.onclick = () => openViewer(i)
    state.tiles.set(node, tile)
    observer.observe(tile)
    return tile
  }))
}

// ---- upload ----
$('pick').onchange = async () => {
  const files = [...$('pick').files]
  $('pick').value = ''
  if (!files.length) return
  const ok = files.filter(f => mediaKind(f.name))
  const skipped = files.filter(f => !mediaKind(f.name)).map(f => f.name)
  const failed = []
  const msg = $('up-msg'), prog = $('uprog')
  const ups = document.querySelectorAll('[data-action="upload"]')
  ups.forEach(b => { b.disabled = true })
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
    ups.forEach(b => { b.disabled = false })
  }
  const parts = []
  if (skipped.length) parts.push(`Übersprungen (Format kennt MediaVault nicht): ${skipped.join(', ')}`)
  if (failed.length) parts.push(`Fehlgeschlagen: ${failed.join(', ')}`)
  msg.textContent = parts.join('. ')
  msg.hidden = !parts.length
  msg.classList.toggle('err', failed.length > 0)
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

function openViewer(i) {
  if (i < 0 || i >= state.entries.length) return
  current = i
  openNode(state.entries[i])
}

// left/right: the neighbour in the grid, or in the random history (left = next pick, right = previous one)
function step(d) {
  if (!random.active()) return openViewer(current + d)
  const node = d > 0 ? random.next() : random.prev()
  if (node) openNode(node)
}

async function openNode(node) {
  const me = ++token
  ctrl?.abort()
  ctrl = new AbortController()
  clearMedia()
  $('again').hidden = !random.active()
  $('viewer').hidden = false
  $('vmsg').hidden = true
  chrome(true)
  scores.record(node, 'view') // viewing on the phone counts
  showRating(node)
  $('vbar').hidden = mediaKind(node.name) !== 'video'
  $('vfoot').hidden = $('vbar').hidden && $('rate').hidden
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
  random.end()
  token++
  ctrl?.abort()
  clearMedia()
  showRating(null)
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

// Close button, rating panel and video bar hide 3 s into playback of a video; a tap on the viewer toggles them
// (images never hide on their own), paused keeps them shown.
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
  if (!s) return
  if (e.target.closest('#vfoot')) return chrome(true) // using the bar or the panel keeps them shown
  if (e.target.closest('button') || Math.hypot(t.clientX - s.clientX, t.clientY - s.clientY) > 10) return
  chrome($('viewer').classList.contains('idle'))
}, { passive: true })
$('close').onclick = closeViewer
$('again').onclick = () => openNode(random.again())
const showLoop = () => $('loop').setAttribute('aria-pressed', String(store.get('mv-loop') === '1'))
$('loop').onclick = () => {
  store.set('mv-loop', store.get('mv-loop') === '1' ? '0' : '1')
  showLoop()
  const v = $('vmedia').querySelector('video')
  if (v) v.loop = store.get('mv-loop') === '1'
}
showLoop()
let touch = null
$('viewer').addEventListener('touchstart', e => { touch = e.target.closest('#vfoot') ? null : e.changedTouches[0] }, { passive: true })
$('viewer').addEventListener('touchend', e => {
  if (!touch) return
  const dx = e.changedTouches[0].clientX - touch.clientX
  const dy = e.changedTouches[0].clientY - touch.clientY
  touch = null
  if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1)
}, { passive: true })
document.addEventListener('keydown', e => {
  if ($('viewer').hidden || e.target.id === 'rval') return // arrows move the cursor in the number field
  if (e.key === 'ArrowRight') step(1)
  else if (e.key === 'ArrowLeft') step(-1)
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
$('sort').onchange = () => {
  store.set('mv-sort', $('sort').value)
  renderGrid()
}
async function doLogout() {
  if (!confirm('Abmelden und alle gespeicherten Dateien auf diesem Gerät löschen?')) return
  // stop work that would refill the caches
  // best effort, at most 5 s: a stalled upload must not block the logout (the queue goes with it)
  await Promise.race([scores.flush().catch(() => {}), new Promise(r => setTimeout(r, 5000))])
  scores.activate(null)
  queue.length = 0
  observer.disconnect()
  ctrl?.abort()
  try { await state.storage?.close?.() } catch {}
  try { await logout() } catch (e) { console.warn('logout failed', e) }
  state.storage = state.folder = state.lib = null
  show('s-login')
}
$('offline-logout').onclick = doLogout
start()
