import test from 'node:test'
import assert from 'node:assert/strict'
import { slide, spawn, newGame, hasMoves } from './game2048.js'
const board = (row) => [...row, ...Array(12).fill(0)]
test('each tile merges only once and score counts every merge', () => {
  assert.deepEqual(slide(board([2,2,2,2]), 'left'), { board: board([4,4,0,0]), points: 8, moved: true })
  assert.deepEqual(slide(board([2,2,4,0]), 'left').board, board([4,4,0,0]))
})
test('all four directions and input immutability', () => {
  const input = board([2,2,0,0]); const original = [...input]
  assert.deepEqual(slide(input, 'right').board, board([0,0,0,4]))
  assert.deepEqual(slide(input, 'down').board.slice(12), [2,2,0,0])
  assert.deepEqual(slide(slide(input, 'down').board, 'up').board, input)
  assert.deepEqual(input, original)
})
test('blocked moves do not change board or award points', () => {
  const input = board([2,4,8,16]); const result = slide(input, 'left')
  assert.equal(result.moved, false); assert.equal(result.points, 0)
})
test('detect full lost board and available merges', () => {
  const full = [2,4,2,4,4,2,4,2,2,4,2,4,4,2,4,2]
  assert.equal(hasMoves(full), false)
  assert.equal(hasMoves(full.map((n,i) => i === 1 ? 2 : n)), true)
})
test('new games spawn two tiles; spawning preserves full boards', () => {
  assert.equal(newGame().board.filter(Boolean).length, 2)
  const input = Array(16).fill(2); assert.deepEqual(spawn(input), input)
  const empty = Array(16).fill(0); const result = spawn(empty)
  assert.equal(result.filter(Boolean).length, 1); assert.equal(empty.some(Boolean), false)
})
