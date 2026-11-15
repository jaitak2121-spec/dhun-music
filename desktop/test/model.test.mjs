import test from 'node:test';
import assert from 'node:assert/strict';
import { validId, searchTerm, tracksFromSearch, nextIndex } from '../model.mjs';
test('untrusted search and stream input stays within YouTube', () => {
  assert.equal(searchTerm('  piano  '), 'piano');
  for (const value of ['', null, 'x'.repeat(161)]) assert.throws(() => searchTerm(value));
  assert.equal(validId('dQw4w9WgXcQ'), true);
  assert.equal(validId('--exec cmd'), false);
  assert.deepEqual(tracksFromSearch({ entries: [{ id: 'dQw4w9WgXcQ', title: 'Music', duration: 32, channel: 'Artist' }, { id: '../file', title: 'Bad' }, { id: 'aaaaaaaaaaa', title: 'Private', availability: 'private' }] }).map(t => t.id), ['dQw4w9WgXcQ']);
});
test('queue advances, stops, repeats and shuffles without repeating the same track', () => {
  assert.equal(nextIndex(0, 3, 1, false, false), 1);
  assert.equal(nextIndex(2, 3, 1, false, false), -1);
  assert.equal(nextIndex(2, 3, 1, true, false), 0);
  assert.equal(nextIndex(0, 3, -1, true, false), 2);
  assert.equal(nextIndex(0, 0, 1, true, true), -1);
  for (const random of [0, .5, .999]) assert.notEqual(nextIndex(1, 3, 1, true, true, () => random), 1);
});
