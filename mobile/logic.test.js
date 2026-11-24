import test from 'node:test'
import assert from 'node:assert/strict'
import { mediaKind, mimeType, collectMedia, listFolders, sortEntries, uniqueName, isNetworkError } from './logic.js'

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
