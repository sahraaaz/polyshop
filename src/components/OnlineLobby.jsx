import { useEffect, useState } from 'react'
import { arcadeApi, arcadeRequest } from './ArcadeBoard'
export default function OnlineLobby() {
  const [name,setName]=useState(''),[token,setToken]=useState(''),[state,setState]=useState(null),[error,setError]=useState(''),[waiting,setWaiting]=useState(false)
  useEffect(()=>{
    if(!token)return
    let alive=true
    const poll=()=>arcadeRequest('/state',{token}).then((data)=>{if(alive){setState(data);setError('')}}).catch((e)=>{if(alive)setError(e.message)})
    poll();const timer=setInterval(poll,2000);return()=>{alive=false;clearInterval(timer)}
  },[token])
  const action=async(path,data={})=>{try{await arcadeRequest(path,{token,...data});setError('')}catch(e){setError(e.message)}}
  const match=state?.match
  return <section className="online-lobby"><h3>لابی آنلاین · چهار در یک ردیف</h3><p>چهار مهره را افقی، عمودی یا مورب کنار هم بچین.</p>{!arcadeApi?<div className="lobby-notice">لابی برای اتصال به سرور آماده است. بازی بین دو گوشی پس از راه‌اندازی سرور فعال می‌شود.</div>:!token?<form onSubmit={async(e)=>{e.preventDefault();try{const data=await arcadeRequest('/join',{name});setToken(data.token)}catch(err){setError(err.message)}}}><input value={name} maxLength={32} onChange={(e)=>setName(e.target.value)} placeholder="نام نمایشی" required/><button>ورود به لابی</button></form>:<><div className="lobby-people">{state?.players.map((p)=><span key={p.id}>{p.name} · {p.busy?'در بازی':'آماده'}</span>)}</div>{!match?<button disabled={waiting} onClick={()=>{action('/queue');setWaiting(true)}}>{waiting?'منتظر حریف آنلاین…':'پیدا کردن حریف'}</button>:<><p aria-live="polite">{match.result?match.result==='draw'?'مساوی شد':match.result===state.me?'برنده شدی!':'حریف برنده شد':match.turn===state.me?'نوبت توست':'نوبت حریف'}</p><div className="connect-four">{Array.from({length:7},(_,col)=><button key={col} aria-label={`ستون ${col+1}`} disabled={!!match.result||match.turn!==state.me} onClick={()=>action('/move',{column:col})}>＋</button>)}{match.board.map((cell,i)=><i key={i} className={cell?cell===state.me?'mine':'opponent':''}/>)}</div></>}<button onClick={()=>{action('/leave');setWaiting(false)}}>ترک بازی / لغو انتظار</button></>}<p role="status">{error}</p></section>
}
