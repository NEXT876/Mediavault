// Rating panel of the viewer: stats line, buttons 1-5 and "Score setzen". Data and queue live in scores.js.
import * as scores from './scores.js'

const $ = id => document.getElementById(id)
const DELTA = { 1: '−10', 2: '−5', 3: '±0', 4: '+5', 5: '+10' } // same as the tooltips of the desktop app
let node = null

$('rbtns').replaceChildren(...Object.entries(DELTA).map(([r, d]) => {
  const b = document.createElement('button')
  b.textContent = r
  b.dataset.r = r
  b.setAttribute('aria-label', `Bewertung ${r}: Score ${d}`)
  return b
}))

function closeForm() {
  $('rform').hidden = true
  $('rrow').hidden = false
}

export function render() {
  const it = node && scores.item(node)
  if (!it) return
  const b = document.createElement('b')
  b.textContent = `Score ${it.score}/100`
  $('rstats').replaceChildren(b, ` · ${it.watched}× angesehen · ${it.ratings} Bewertungen`)
}

// null hides the panel (viewer closed, or no MediaVault data)
export function showRating(n) {
  node = n && scores.active() ? n : null
  $('rate').hidden = !node
  closeForm()
  render()
}

$('rbtns').onclick = e => {
  const btn = e.target.closest('button')
  if (!btn || !node) return
  scores.record(node, 'rate', +btn.dataset.r)
  btn.classList.add('ok') // brief confirmation
  setTimeout(() => btn.classList.remove('ok'), 500)
}
$('rset').onclick = () => {
  $('rrow').hidden = true
  $('rform').hidden = false
  $('rval').value = scores.item(node).score
  $('rval').focus()
  $('rval').select()
}
$('rcancel').onclick = closeForm
$('rval').onkeydown = e => { if (e.key === 'Escape') closeForm() }
$('rform').onsubmit = e => {
  e.preventDefault() // the browser has already checked 1-100
  scores.record(node, 'set', +$('rval').value)
  closeForm()
}
