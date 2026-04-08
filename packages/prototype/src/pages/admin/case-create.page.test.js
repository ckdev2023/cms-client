import assert from 'node:assert/strict'
import test from 'node:test'
import { getText, safeJsonParse } from './case-create.page.js'

test('safeJsonParse returns null for invalid json', () => {
  assert.equal(safeJsonParse('{'), null)
})

test('safeJsonParse parses objects', () => {
  assert.deepEqual(safeJsonParse('{"a":1}'), { a: 1 })
})

test('getText formats nameNative', () => {
  assert.equal(getText({ displayName: 'Wang Wei', nameNative: '王伟' }), 'Wang Wei（王伟）')
  assert.equal(getText({ displayName: 'Li' }), 'Li')
})
