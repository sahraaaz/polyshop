import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import Game2048 from './Game2048.jsx'
import Snake from './Snake.jsx'
import ArcadeBoard from './ArcadeBoard.jsx'
import OnlineLobby from './OnlineLobby.jsx'
import './Arcade.css'

const fa = (value, options) => new Intl.NumberFormat('fa-IR', options).format(value)
const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
const winnerOf = (board) => wins.find((line) => board[line[0]] && board[line[0]] === board[line[1]] && board[line[0]] === board[line[2]])?.map((index) => board[index])[0] || (board.every(Boolean) ? 'draw' : '')

function ReactionGame({ best, onBest }) {
  const [phase, setPhase] = useState('idle')
  const [result, setResult] = useState(null)
  const readyAt = useRef(0)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  const start = () => {
    clearTimeout(timer.current); setResult(null); setPhase('waiting')
    timer.current = setTimeout(() => { readyAt.current = performance.now(); setPhase('ready') }, 1200 + Math.random() * 2200)
  }
  const tap = () => {
    if (phase === 'waiting') { clearTimeout(timer.current); setPhase('early'); return }
    if (phase !== 'ready') return
    const value = Math.round(performance.now() - readyAt.current)
    setResult(value); setPhase('result'); if (!best || value < best) onBest(value)
  }
  const copy = { idle: ['آماده‌ای؟', 'شروع'], waiting: ['صبر کن…', 'هنوز نزن'], ready: ['الان!', 'بزن'], early: ['زود زدی 😅', 'دوباره'], result: [`${fa(result || 0)} میلی‌ثانیه`, 'یک‌بار دیگه'] }[phase]
  return <div className="micro-game reaction-game"><div className="game-metric"><small>بهترین واکنش</small><b>{best ? `${fa(best)} ms` : '—'}</b></div><button className={`reaction-pad ${phase}`} onClick={phase === 'waiting' || phase === 'ready' ? tap : start}><span>{copy[0]}</span><small>{copy[1]}</small></button><p>وقتی صفحه سبز شد بزن؛ قبلش بزنی باختی.</p></div>
}

function TicTacToe({ winsCount, onWin }) {
  const [board, setBoard] = useState(Array(9).fill(''))
  const [turn, setTurn] = useState('human')
  const winner = winnerOf(board)
  const botMove = (current) => {
    const empty = current.map((cell, index) => cell ? null : index).filter((index) => index !== null)
    const findMove = (mark) => empty.find((index) => winnerOf(current.map((cell, i) => i === index ? mark : cell)) === mark)
    return findMove('O') ?? findMove('X') ?? ([4,0,2,6,8].find((index) => empty.includes(index))) ?? empty[Math.floor(Math.random() * empty.length)]
  }
  useEffect(() => {
    if (turn !== 'bot' || winner) return
    const timer = setTimeout(() => { setBoard((current) => { const index = botMove(current); if (index === undefined) return current; return current.map((cell, i) => i === index ? 'O' : cell) }); setTurn('human') }, 360)
    return () => clearTimeout(timer)
  }, [turn, winner])
  useEffect(() => { if (winner === 'X') onWin() }, [winner])
  const play = (index) => { if (turn !== 'human' || board[index] || winner) return; setBoard((current) => current.map((cell, i) => i === index ? 'X' : cell)); setTurn('bot') }
  const reset = () => { setBoard(Array(9).fill('')); setTurn('human') }
  return <div className="micro-game xo-game"><div className="game-metric"><small>بردهای تو</small><b>{fa(winsCount)}</b></div><div className="xo-board">{board.map((cell, index) => <button key={index} onClick={() => play(index)} aria-label={`خانه ${index + 1}`}>{cell && <span className={cell === 'X' ? 'x' : 'o'}>{cell}</span>}</button>)}</div><div className="xo-status"><span>{winner === 'X' ? 'بردی! 🔥' : winner === 'O' ? 'این دست با ربات بود 🤖' : winner === 'draw' ? 'مساوی؛ دوباره؟' : turn === 'bot' ? 'ربات داره فکر می‌کنه…' : 'نوبت توئه؛ تو X هستی.'}</span><button onClick={reset}>بازی تازه</button></div></div>
}

export default function PolyGame({ onBack }) {
  const [records, setRecords] = useState(() => { try { return JSON.parse(localStorage.getItem('poly-arcade-records')) || [] } catch { return [] } })
  const [playerName, setPlayerName] = useState(() => { try { return localStorage.getItem('poly-arcade-name') || 'بازیکن' } catch { return 'بازیکن' } })
  const record = useCallback((game, score) => {
    if (!score) return
    setRecords((rows) => {
      const old = rows.find((r) => r.game === game && r.name === playerName)
      if (old && (game === 'reaction' ? score >= old.score : score <= old.score)) return rows
      return [...rows.filter((r) => r !== old), {game, name:playerName, score}]
    })
  }, [playerName])
  const record2048 = useCallback((score) => record('2048',score),[record])
  const recordSnake = useCallback((score) => record('snake',score),[record])
  useEffect(() => { try { localStorage.setItem('poly-arcade-records',JSON.stringify(records)); localStorage.setItem('poly-arcade-name',playerName) } catch {} },[records,playerName])
  const [active, setActive] = useState('2048')
  const [scores, setScores] = useState(() => { try { return JSON.parse(localStorage.getItem('polygame-scores-v1')) || {} } catch { return {} } })
  useEffect(() => localStorage.setItem('polygame-scores-v1', JSON.stringify(scores)), [scores])
  const setBest = (key, value) => setScores((prev) => ({ ...prev, [key]: value }))
  const games = useMemo(() => [
    { id: '2048', icon: '2048', title: '2048 · ترکیب عددها', time: 'تک‌نفره', desc: 'بکش، ترکیب کن و رکورد بزن.' },
    { id: 'reaction', icon: '⚡', title: 'واکنش سریع', time: '۱۰ ثانیه', desc: 'تا سبزشدن صبر کن و سریع بزن.' },
    { id: 'snake', icon: 'S', title: 'Supply Snake', time: 'تک‌نفره', desc: 'بسته‌ها را جمع کن و رکورد بزن.' },
    { id: 'online', icon: 'VS', title: 'لابی آنلاین', time: 'دونفره', desc: 'چهار در یک ردیف با حریف آنلاین.' },
    { id: 'xo', icon: 'XO', title: 'دوز با ربات', time: '۳۰ ثانیه', desc: 'یک دست کوتاه مقابل ربات Poly.' },
  ], [])
  return <section className="polygame-page" id="polygame"><div className="polygame-hero"><button className="game-back" onClick={onBack}>→ برگشت به فروشگاه</button><span className="game-kicker">POLYGAME / QUICK BREAK</span><h1>بین دو کلاس،<br/><em>یه دست بازی.</em></h1><p>بازی‌های خیلی سبک و کوتاه؛ بدون نصب، بدون ثبت‌نام و بدون اینکه دیتات تموم شه.</p><div className="game-pills"><span>● آفلاین بعد از بارگذاری</span><span>رکورد روی همین دستگاه</span><span>کوتاه بازی کن، بعداً ادامه بده</span></div></div><div className="game-shell"><aside className="game-library"><div><small>بازی‌های سبک</small><b>یکی رو انتخاب کن</b></div>{games.map((game) => <button key={game.id} className={active === game.id ? 'active' : ''} onClick={() => setActive(game.id)}><span>{game.icon}</span><div><b>{game.title}</b><small>{game.desc}</small></div><i>{game.time}</i></button>)}</aside><main className="game-stage"><header><div><span>{games.find((game) => game.id === active)?.icon}</span><div><small>NOW PLAYING</small><h2>{games.find((game) => game.id === active)?.title}</h2></div></div><b>صدای زنگ رو می‌شنوی؟ جمعش کن 😄</b></header>{active === '2048' && <Game2048 onScore={record2048}/>}{active === 'reaction' && <ReactionGame best={scores.reaction} onBest={(value) => { setBest('reaction', value); record('reaction',value) }}/>} {active === 'snake' && <Snake onScore={recordSnake}/>} {active === 'online' && <OnlineLobby/>} {active === 'xo' && <TicTacToe winsCount={scores.xoWins || 0} onWin={() => setScores((prev) => ({ ...prev, xoWins: (prev.xoWins || 0) + 1 }))}/>}</main></div><div className="arcade-player"><label>نام روی تابلوی رکورد<input value={playerName} maxLength={32} onChange={(e)=>setPlayerName(e.target.value)} /></label></div><ArcadeBoard records={records}/></section>
}
