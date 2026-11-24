import test from 'node:test'
import assert from 'node:assert/strict'
import { mediaKind, collectMedia, findFolder, sortEntries, uniqueName } from './logic.js'

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
test('findFolder ignores case and surrounding spaces', () => {
  const nodes = [{ name: 'MediaVault ', directory: true }, { name: 'mediavault.txt', directory: false }]
  assert.equal(findFolder(nodes, 'mediavault').name, 'MediaVault ')
  assert.equal(findFolder(nodes, 'fehlt'), null)
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
