export function slide(board, direction) {
  const result = [...board]
  let points = 0
  for (let line = 0; line < 4; line++) {
    const indexes = Array.from({ length: 4 }, (_, step) => direction === 'left' ? line * 4 + step : direction === 'right' ? line * 4 + 3 - step : direction === 'up' ? step * 4 + line : (3 - step) * 4 + line)
    const values = indexes.map((i) => board[i]).filter(Boolean)
    const merged = []
    for (let i = 0; i < values.length; i++) {
      if (values[i] === values[i + 1]) { const value = values[i] * 2; merged.push(value); points += value; i++ }
      else merged.push(values[i])
    }
    indexes.forEach((index, i) => { result[index] = merged[i] || 0 })
  }
  return { board: result, points, moved: result.some((value, i) => value !== board[i]) }
}

export function spawn(board) {
  const empty = board.map((value, i) => value ? -1 : i).filter((i) => i >= 0)
  if (!empty.length) return [...board]
  const result = [...board]
  result[empty[Math.floor(Math.random() * empty.length)]] = Math.random() < .9 ? 2 : 4
  return result
}

export const newGame = () => ({ board: spawn(spawn(Array(16).fill(0))), score: 0, continued: false })
export const hasMoves = (board) => ['left', 'right', 'up', 'down'].some((direction) => slide(board, direction).moved)
