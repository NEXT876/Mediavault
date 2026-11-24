// Random picks like the desktop app (MediaDatabase.get_random): pool, smart weights, last picks excluded.
import { collectMedia, randomPool, pickRandom, smartWeight } from './logic.js'
import * as scores from './scores.js'

const RECENT_PICKS = 2
let recent = [] // last picks of this folder, kept across random sessions
let sess = null // { pool, weightOf, history: [node], pos } while the viewer was opened by Zufall

export const active = () => !!sess
export const end = () => { sess = null }
export const reset = () => { recent = []; sess = null } // folder changed

function draw() {
  const node = pickRandom(sess.pool, sess.weightOf, recent)
  recent = [...recent.filter(n => n !== node), node].slice(-RECENT_PICKS)
  sess.history.push(node)
  sess.pos = sess.history.length - 1
  return node
}

// spec: { kinds: ['image'|'video'], groups?: [names], smart }. Returns the first pick, or null (pool empty, no session).
export function begin(folder, { kinds, groups = null, smart }) {
  const pool = randomPool(collectMedia(folder), { kinds, groups }, scores.item)
  if (!pool.length) return sess = null
  // without MediaVault data scores.item is null and every weight is equal, so smart behaves like normal
  sess = { pool, weightOf: smart ? n => smartWeight(scores.item(n), Date.now() / 1000) : null, history: [], pos: -1 }
  return draw()
}

export const again = draw
export const prev = () => sess.pos > 0 ? sess.history[--sess.pos] : null
export const next = () => sess.pos < sess.history.length - 1 ? sess.history[++sess.pos] : draw()
