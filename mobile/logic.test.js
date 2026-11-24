import test from 'node:test'
import assert from 'node:assert/strict'
import { mediaKind, mimeType, collectMedia, findFolder, sortEntries, uniqueName, isNetworkError } from './logic.js'

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
test('findFolder ignores case and spaces, only looks under root, prefers the shallowest', () => {
  const root = { name: 'root', directory: true }, trash = { name: 'Rubbish', directory: true }
  const mk = (name, parent) => ({ name, directory: true, parent })
  const deep = mk('Bib', mk('x', root)), top = mk('bib ', root), trashed = mk('Bib', trash)
  assert.equal(findFolder([trashed, deep, top], 'BIB', root), top)
  assert.equal(findFolder([trashed, deep], 'bib', root), deep)
  assert.equal(findFolder([trashed], 'bib', root), null)
  assert.equal(findFolder([top, { name: 'bib', directory: false, parent: root }], 'fehlt', root), null)
  assert.equal(findFolder([mk(null, root), top], 'bib', root), top) // undecryptable names do not crash
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
