import test from 'node:test'
import assert from 'node:assert/strict'
import {
  mediaKind, mimeType, collectMedia, listFolders, sortEntries, uniqueName, isNetworkError,
  DATA_DIR, relPath, applyEvents, scoreTier, smartWeight, pickRandom, targetAngle, randomPool, parseEntries, contrastColor, labelFlipped, liveBatches,
} from './logic.js'

test('mediaKind', () => {
  assert.equal(mediaKind('A.JPG'), 'image')
  assert.equal(mediaKind('clip.mov'), 'video')
  assert.equal(mediaKind('foto.heic'), null)
  assert.equal(mediaKind('ohne_endung'), null)
})
test('collectMedia walks subfolders and skips other files', () => {
  const tree = { children: [
    { name: 'a.png', directory: false },
    { name: 'notes.txt', directory: false },
    { name: 'Vom Handy', directory: true, children: [{ name: 'b.mp4', directory: false }] },
  ] }
  assert.deepEqual(collectMedia(tree).map(n => n.name), ['a.png', 'b.mp4'])
})
test('listFolders lists nested folders with path and media count, sorted', () => {
  const root = { children: [
    { name: 'b2', directory: true, children: [{ name: 'x.jpg', directory: false }] },
    { name: 'b10', directory: true, children: [
      { name: 'Vom Handy', directory: true, children: [{ name: 'v.mov', directory: false }, { name: 'n.txt', directory: false }] },
    ] },
    { name: null, directory: true, children: [] },
    { name: 'a.jpg', directory: false },
  ] }
  assert.deepEqual(listFolders(root).map(f => [f.path, f.count]),
    [['?', 0], ['b2', 1], ['b10', 1], ['b10 / Vom Handy', 1]])
})
test('sortEntries by date (newest first) and by name (numeric)', () => {
  const n = [{ name: 'b10.jpg', timestamp: 1 }, { name: 'b2.jpg', timestamp: 3 }, { name: 'a.jpg', timestamp: 2 }]
  assert.deepEqual(sortEntries(n, 'date').map(x => x.name), ['b2.jpg', 'a.jpg', 'b10.jpg'])
  assert.deepEqual(sortEntries(n, 'name').map(x => x.name), ['a.jpg', 'b2.jpg', 'b10.jpg'])
})
test('uniqueName counts up like the PC and remembers its picks', () => {
  const taken = new Set(['image.jpg'])
  assert.equal(uniqueName('IMAGE.jpg', taken), 'IMAGE-2.jpg')
  assert.equal(uniqueName('image.jpg', taken), 'image-3.jpg')
  assert.equal(uniqueName('neu.mov', taken), 'neu.mov')
})
test('mimeType', () => {
  assert.equal(mimeType('a.jpg'), 'image/jpeg')
  assert.equal(mimeType('b.MOV'), 'video/quicktime')
  assert.equal(mimeType('c.xyz'), 'application/octet-stream')
  assert.equal(mimeType('x.constructor'), 'application/octet-stream')
})
test('isNetworkError only matches fetch failures', () => {
  assert.equal(isNetworkError(new TypeError('Load failed')), true)
  assert.equal(isNetworkError(new TypeError('Failed to fetch')), true)
  assert.equal(isNetworkError(new TypeError("undefined is not an object (evaluating 'r.ok.reduce')")), false)
  assert.equal(isNetworkError(new Error('Load failed')), false)
})

test('collectMedia and listFolders hide the data folder', () => {
  const root = { children: [
    { name: DATA_DIR, directory: true, children: [{ name: 'x.jpg', directory: false }] },
    { name: 'a', directory: true, children: [{ name: 'b.jpg', directory: false }] },
  ] }
  assert.deepEqual(collectMedia(root).map(n => n.name), ['b.jpg'])
  assert.deepEqual(listFolders(root).map(f => f.path), ['a'])
})
test('relPath joins names below the root or returns null', () => {
  const root = { name: 'Bib' }
  const sub = { name: 'Vom Handy', parent: root }
  const file = { name: 'a.jpg', parent: sub }
  assert.equal(relPath(file, root), 'Vom Handy/a.jpg')
  assert.equal(relPath({ name: 'x', parent: { name: 'other', parent: {} } }, root), null)
  assert.equal(relPath({ name: 'x' }, root), null)
})
const item = (score, watched = 0, last_watched = 0, ratings = 0) => ({ title: 't', type: 'image', score, group: '', watched, last_watched, ratings })
test('applyEvents rate/set/view like the PC, input untouched', () => {
  const items = { 'A/x.jpg': item(50, 2, 100, 1) }
  const out = applyEvents(items, [
    { path: 'a/X.JPG', kind: 'rate', value: 5, at: 200 },
    { path: 'A/x.jpg', kind: 'view', at: 150 },
    { path: 'nope.jpg', kind: 'view', at: 1 },
  ])
  assert.deepEqual(Object.keys(out), ['A/x.jpg'])
  assert.deepEqual(out['A/x.jpg'], item(60, 4, 200, 2))
  assert.deepEqual(items['A/x.jpg'], item(50, 2, 100, 1))
})
test('applyEvents clamps, orders by at (stable) and keeps last_watched maximal', () => {
  const run = (score, events) => applyEvents({ p: item(score) }, events.map(e => ({ path: 'p', ...e }))).p
  assert.equal(run(95, [{ kind: 'rate', value: 5, at: 1 }]).score, 100)
  assert.equal(run(5, [{ kind: 'rate', value: 1, at: 1 }]).score, 1)
  assert.equal(run(50, [{ kind: 'rate', value: 3, at: 1 }]).score, 50)
  assert.equal(run(50, [{ kind: 'set', value: 100, at: 2 }, { kind: 'rate', value: 1, at: 1 }]).score, 100)
  assert.equal(run(50, [{ kind: 'set', value: 7, at: 1 }, { kind: 'rate', value: 4, at: 1 }]).score, 12)
  assert.equal(run(50, [{ kind: 'view', at: 9 }, { kind: 'view', at: 5 }]).last_watched, 9)
  assert.equal(run(50, [{ kind: 'set', value: 80, at: 1 }]).watched, 0)
})
test('scoreTier boundaries', () => {
  assert.deepEqual([100, 75, 74, 50, 49, 25, 24, 1].map(scoreTier),
    ['high', 'high', 'mid', 'mid', 'low', 'low', 'bad', 'bad'])
})
test('smartWeight', () => {
  const now = 1_000_000_000
  assert.equal(smartWeight(undefined, now), 70)
  assert.equal(smartWeight(item(80), now), 100)
  assert.ok(Math.abs(smartWeight(item(80, 2), now) - 100 * 0.85 ** 2) < 1e-9)
  assert.ok(Math.abs(smartWeight(item(80, 0, now - 3600), now) - 30) < 1e-9)
  assert.ok(Math.abs(smartWeight(item(80, 0, now - 3 * 86400), now) - 60) < 1e-9)
  assert.equal(smartWeight(item(80, 0, now - 8 * 86400), now), 100)
  assert.equal(smartWeight(item(1, 40, now - 100), now), 1)
})
test('pickRandom uniform, weighted, recent and empty', () => {
  const pool = ['a', 'b', 'c']
  assert.equal(pickRandom([], null, []), null)
  assert.equal(pickRandom(pool, null, [], () => 0), 'a')
  assert.equal(pickRandom(pool, null, [], () => 0.99), 'c')
  assert.equal(pickRandom(pool, null, ['a'], () => 0), 'b')
  assert.equal(pickRandom(pool, null, pool, () => 0), 'a') // whole pool recent: ignore recent
  const w = { a: 1, b: 1, c: 8 }
  assert.equal(pickRandom(pool, x => w[x], [], () => 0.05), 'a')
  assert.equal(pickRandom(pool, x => w[x], [], () => 0.15), 'b')
  assert.equal(pickRandom(pool, x => w[x], [], () => 0.5), 'c')
  assert.equal(pickRandom(pool, x => w[x], ['c'], () => 0.99), 'b')
})
test('targetAngle matches the PC wheel', () => {
  // expected values from mediavault.extras.wheel.page.target_angle
  assert.equal(targetAngle(10, 2, 8, 4), 1687.5)
  assert.equal(targetAngle(0, 0, 5, 4), 1764)
  assert.equal(targetAngle(123.5, 7, 8, 6), 2542.5)
  assert.equal(targetAngle(700, 3, 3, 1), 1740) // too few turns: pushed past 3.2
  assert.equal(targetAngle(50, 1, 2, 3.3), 1530)
})

test('randomPool filters by kind and group', () => {
  const nodes = ['a.png', 'b.jpg', 'v.mp4', 'x.txt'].map(name => ({ name }))
  const groups = { 'a.png': 'Natur', 'v.mp4': 'Reise' }
  const itemOf = n => (groups[n.name] ? { group: groups[n.name] } : null)
  const names = (spec) => randomPool(nodes, spec, itemOf).map(n => n.name)
  assert.deepEqual(names({ kinds: ['image'], groups: null }), ['a.png', 'b.jpg'])
  assert.deepEqual(names({ kinds: ['image', 'video'], groups: null }), ['a.png', 'b.jpg', 'v.mp4'])
  assert.deepEqual(names({ kinds: ['image', 'video'], groups: ['Natur', 'Reise'] }), ['a.png', 'v.mp4'])
  assert.deepEqual(names({ kinds: ['video'], groups: ['Natur'] }), [])
  assert.deepEqual(names({ kinds: [], groups: null }), [])
})

test('parseEntries keeps trimmed non-empty lines', () => {
  assert.deepEqual(parseEntries(' Pizza \n\n  \r\nSushi\r\n\tDöner'), ['Pizza', 'Sushi', 'Döner'])
  assert.deepEqual(parseEntries(''), [])
  assert.deepEqual(parseEntries(' \n \n'), [])
})

test('contrastColor matches the PC wheel labels', () => {
  // from mediavault.extras.wheel.page.WHEEL_SLICE_COLORS: blue, coral, yellow, green, lavender, turquoise
  const dark = '#11141c', white = '#ffffff'
  assert.deepEqual(['#4f8cff', '#ff6b6b', '#ffd93d', '#2f9e6f', '#b983ff', '#25c4a8'].map(contrastColor), [dark, dark, dark, white, dark, dark])
  assert.equal(contrastColor('#000000'), white)
  assert.equal(contrastColor('#ffffff'), dark)
  assert.equal(contrastColor('#7c6cf6'), white)
})

test('labelFlipped: no wheel label is upside down', () => {
  // text direction on screen: outward (sin mid, -cos mid) when not flipped, inward when flipped; readable = pointing right (or down)
  const readable = mid => (labelFlipped(mid) ? -1 : 1) * Math.sin(mid * Math.PI / 180) >= -1e-9
  for (const mid of [22.5, 45, 90, 135, 180, 225, 270, 315, 337.5]) assert.ok(readable(mid), `label at ${mid} degrees`)
  assert.deepEqual([45, 90, 180].map(labelFlipped), [false, false, false])
  assert.deepEqual([181, 270, 315].map(labelFlipped), [true, true, true])
})

test('liveBatches keeps pending and still-present confirmed batches, drops applied and rejected ones', () => {
  const sent = [{ name: 'applied.json' }, { name: 'pending.json', pending: true }, { name: 'present.json' }, { name: 'missing.json' }]
  const kept = liveBatches(sent, new Set(['applied.json']), new Set(['present.json', 'applied.json']))
  assert.deepEqual(kept.map(b => b.name), ['pending.json', 'present.json'])
})
