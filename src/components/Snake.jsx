import { useEffect, useRef, useState } from 'react'
const size = 16
export default function Snake({ onScore }) {
  const [snake, setSnake] = useState([119,118,117])
  const [food, setFood] = useState(85)
  const [status, setStatus] = useState('idle')
  const [score, setScore] = useState(0)
  const direction = useRef(1), queued = useRef(1), touch = useRef(null)
  const steer = (next) => { if (next !== -direction.current) queued.current = next }
  useEffect(() => {
    const handleKey = (event) => {
      if (status !== 'playing') return
      const target = event.target
      if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return
      const next = { ArrowUp: -16, ArrowDown: 16, ArrowLeft: -1, ArrowRight: 1 }[event.key]
      if (!next) return
      event.preventDefault()
      steer(next)
    }
    window.addEventListener('keydown', handleKey, { passive: false })
    return () => window.removeEventListener('keydown', handleKey)
  }, [status])
  const swipe = (event) => {
    if (!touch.current || status !== 'playing') return
    const dx = event.clientX - touch.current[0], dy = event.clientY - touch.current[1]
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return
    steer(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 1 : -1 : dy > 0 ? 16 : -16)
    touch.current = [event.clientX, event.clientY]
  }
  useEffect(() => {
    if (status !== 'playing') return
    const timer = setTimeout(() => {
      direction.current = queued.current
      const head = snake[0], next = head + direction.current, eating = next === food
      if (next < 0 || next >= size * size || (Math.abs(direction.current) === 1 && Math.floor(next / size) !== Math.floor(head / size)) || snake.slice(0, eating ? snake.length : -1).includes(next)) { setStatus('over'); onScore(score); return }
      const body = [next, ...snake]; if (!eating) body.pop()
      setSnake(body)
      if (eating) {
        const points = score + 10; setScore(points); onScore(points)
        const empty = Array.from({length:256}, (_, i) => i).filter((i) => !body.includes(i))
        if (!empty.length) { setStatus('won'); return }
        setFood(empty[Math.floor(Math.random() * empty.length)])
      }
    }, Math.max(85, 190 - score))
    return () => clearTimeout(timer)
  }, [snake, food, status, score, onScore])
  useEffect(() => { const pause = () => { if (document.hidden) setStatus((s) => s === 'playing' ? 'paused' : s) }; document.addEventListener('visibilitychange', pause); return () => document.removeEventListener('visibilitychange', pause) }, [])
  const reset = () => { setSnake([119,118,117]); setFood(85); setScore(0); direction.current = 1; queued.current = 1; setStatus('playing') }
  return <div className="snake-game"><div className="arcade-score"><b>SUPPLY SNAKE</b><span>امتیاز: {score.toLocaleString('fa-IR')}</span></div><p>بسته‌ها را جمع کن؛ به دیوار یا زنجیره نخور!</p><div className="snake-board" tabIndex="0" role="group" aria-label="بازی مار"
    onPointerDown={(e) => { if (e.target.closest('button')) return; e.currentTarget.focus(); e.currentTarget.setPointerCapture(e.pointerId); touch.current = [e.clientX,e.clientY] }} onPointerCancel={() => { touch.current = null }}
    onPointerMove={swipe}
    onPointerUp={(e) => { swipe(e); touch.current = null }}>
    {Array.from({length:256},(_,i)=><i key={i} className={i === snake[0] ? 'snake-head' : snake.includes(i) ? 'snake-body' : food === i ? 'snake-food' : ''}/>)}
    {status !== 'playing' && <div className="arcade-overlay"><b>{status==='idle'?'آماده جمع‌آوری؟':status==='paused'?'بازی متوقف شد':status==='won'?'کل صفحه رو گرفتی!':'این دست تموم شد'}</b><button onClick={status==='paused'?()=>setStatus('playing'):reset}>{status==='paused'?'ادامه':'شروع بازی'}</button></div>}</div><div className="arcade-controls"><button disabled={status !== 'playing' && status !== 'paused'} onClick={()=>setStatus((s)=>s==='playing'?'paused':s==='paused'?'playing':s)}>{status === 'paused' ? 'ادامه' : 'مکث'}</button></div><p className="snake-control-hint">لپ‌تاپ: کلیدهای جهت کیبورد · گوشی: روی زمین بازی انگشتت را به جهت دلخواه بکش.</p></div>
}
