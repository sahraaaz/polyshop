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
    onKeyDown={(e) => { const next = {ArrowUp:-16,ArrowDown:16,ArrowLeft:-1,ArrowRight:1}[e.key]; if (next) { e.preventDefault(); steer(next) } }}
    onPointerDown={(e) => { e.currentTarget.focus(); e.currentTarget.setPointerCapture(e.pointerId); touch.current = [e.clientX,e.clientY] }} onPointerCancel={() => { touch.current = null }}
    onPointerUp={(e) => { if (!touch.current) return; const dx = e.clientX-touch.current[0], dy = e.clientY-touch.current[1]; touch.current=null; if(Math.max(Math.abs(dx),Math.abs(dy))>15) steer(Math.abs(dx)>Math.abs(dy)?dx>0?1:-1:dy>0?16:-16) }}>
    {Array.from({length:256},(_,i)=><i key={i} className={i === snake[0] ? 'snake-head' : snake.includes(i) ? 'snake-body' : food === i ? 'snake-food' : ''}/>)}
    {status !== 'playing' && <div className="arcade-overlay"><b>{status==='idle'?'آماده جمع‌آوری؟':status==='paused'?'بازی متوقف شد':status==='won'?'کل صفحه رو گرفتی!':'این دست تموم شد'}</b><button onClick={status==='paused'?()=>setStatus('playing'):reset}>{status==='paused'?'ادامه':'شروع بازی'}</button></div>}</div><div className="arcade-controls">{[[-16,'↑','بالا'],[-1,'←','چپ'],[16,'↓','پایین'],[1,'→','راست']].map(([d,icon,label])=><button key={d} aria-label={label} onClick={()=>steer(d)}>{icon}</button>)}<button onClick={()=>setStatus((s)=>s==='playing'?'paused':s==='paused'?'playing':s)}>مکث</button></div></div>
}
