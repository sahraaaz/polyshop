import { useEffect, useRef, useState } from 'react'
import { hasMoves, newGame, slide, spawn } from './game2048.js'
import './Game2048.css'

const key = 'polygame-2048-v1'
const fa = (value) => value.toLocaleString('fa-IR')
function readGame() {
  try {
    const saved = JSON.parse(localStorage.getItem(key))
    if (saved?.board?.length === 16 && saved.board.every((n) => Number.isInteger(n) && n >= 0) && Number.isFinite(saved.score)) return saved
  } catch { /* A fresh board works when storage is unavailable. */ }
  return newGame()
}

export default function Game2048() {
  const [game, setGame] = useState(readGame)
  const [best, setBest] = useState(() => { try { return Number(localStorage.getItem(`${key}-best`)) || 0 } catch { return 0 } })
  const [previous, setPrevious] = useState(null)
  const touch = useRef(null)
  const boardRef = useRef(null)
  const won = game.board.some((n) => n >= 2048) && !game.continued
  const over = !hasMoves(game.board)
  useEffect(() => {
    const record = Math.max(best, game.score)
    if (record > best) setBest(record)
    try { localStorage.setItem(key, JSON.stringify(game)); localStorage.setItem(`${key}-best`, String(record)) } catch { /* Playing does not require storage. */ }
  }, [game, best])
  const move = (direction) => {
    if (won || over) return
    const next = slide(game.board, direction)
    if (!next.moved) return
    setPrevious(game)
    setGame({ ...game, board: spawn(next.board), score: game.score + next.points })
  }
  const reset = () => { setGame(newGame()); setPrevious(null); boardRef.current?.focus() }
  return <div className="poly2048">
    <div className="p2048-top"><div><span>MERGE / THINK / REPEAT</span><h3>2048</h3></div><div className="p2048-scores"><span>امتیاز<b>{fa(game.score)}</b></span><span>رکورد<b>{fa(best)}</b></span></div></div>
    <p>عددهای یکسان را ترکیب کن؛ به ۲۰۴۸ برس!</p>
    <div className="p2048-board" ref={boardRef} tabIndex="0" role="group" aria-label="صفحه بازی 2048؛ با کلیدهای جهت یا کشیدن انگشت حرکت کن"
      onKeyDown={(event) => { const direction = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }[event.key]; if (direction) { event.preventDefault(); move(direction) } }}
      onPointerDown={(event) => { touch.current = { x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); event.currentTarget.focus() }}
      onPointerCancel={() => { touch.current = null }}
      onPointerUp={(event) => { if (!touch.current) return; const dx = event.clientX - touch.current.x, dy = event.clientY - touch.current.y; touch.current = null; if (Math.max(Math.abs(dx), Math.abs(dy)) > 20) move(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'down' : 'up') }}>
      {game.board.map((value, i) => <div key={i} className={`p2048-tile tile-${Math.min(value, 2048)}`} aria-label={value ? String(value) : 'خالی'}>{value || ''}</div>)}
      {(won || over) && <div className="p2048-overlay" role="status"><b>{won ? '۲۰۴۸! ساختیش 🎉' : 'این دست تموم شد'}</b><span>امتیاز: {fa(game.score)}</span>{won && <button onClick={() => setGame({ ...game, continued: true })}>ادامه بازی</button>}<button onClick={reset}>بازی تازه</button></div>}
    </div>
    <div className="p2048-controls"><button onClick={reset}>بازی تازه</button><button disabled={!previous} onClick={() => { setGame(previous); setPrevious(null) }}>برگشت یک حرکت</button></div>
    <div className="p2048-directions" aria-label="کنترل جهت بازی">{[['up','↑','بالا'],['left','←','چپ'],['down','↓','پایین'],['right','→','راست']].map(([direction, icon, label]) => <button key={direction} aria-label={label} disabled={won || over} onClick={() => move(direction)}>{icon}</button>)}</div>
    <small>روی گوشی بکش؛ روی کامپیوتر صفحه بازی را انتخاب کن و کلیدهای جهت را بزن. بازی‌ات خودکار ذخیره می‌شود.</small>
  </div>
}
