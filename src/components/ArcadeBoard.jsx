import { useEffect, useState } from 'react'
export const arcadeApi = import.meta.env.VITE_ARCADE_API || ''
export async function arcadeRequest(path, data) {
  if (!arcadeApi) throw new Error('سرور بازی هنوز متصل نیست')
  const response = await fetch(`${arcadeApi}${path}`, { method: data ? 'POST' : 'GET', headers: {'Content-Type':'application/json'}, body: data ? JSON.stringify(data) : undefined })
  const result = await response.json(); if (!response.ok) throw new Error(result.error || 'ارتباط برقرار نشد'); return result
}
export default function ArcadeBoard({ records }) {
  const [game,setGame]=useState('2048'), [remote,setRemote]=useState([])
  const [message,setMessage]=useState('')
  const publish=async()=>{
    try {
      const rows=records.filter((r)=>r.game===game);if(!rows.length)return setMessage('اول یک رکورد ثبت کن.')
      const row=rows.at(-1),{token}=await arcadeRequest('/join',{name:row.name})
      await arcadeRequest('/score',{token,game,score:row.score});setRemote(await arcadeRequest('/scores'));setMessage('رکورد ارسال شد')
    }catch(error){setMessage(error.message)}
  }
  useEffect(()=>{ if(!arcadeApi) return; let alive=true; arcadeRequest('/scores').then((data)=>{if(alive)setRemote(data)}).catch(()=>{}); return()=>{alive=false} },[records])
  const rows=(arcadeApi?remote:records).filter((r)=>r.game===game).sort((a,b)=>game==='reaction'?a.score-b.score:b.score-a.score).slice(0,10)
  return <section className="arcade-leaderboard"><header><div><small>HALL OF FAME</small><h2>تابلوی رکوردهای PolyGame</h2></div><span>{arcadeApi?'جدول آنلاین · رکوردهای ارسالی':'رکوردهای همین مرورگر'}</span></header><nav>{[['2048','2048'],['snake','Snake'],['reaction','واکنش سریع']].map(([id,label])=><button key={id} className={game===id?'active':''} onClick={()=>setGame(id)}>{label}</button>)}</nav><p>{game==='reaction'?'زمان کمتر، رتبه بهتر':'امتیاز بیشتر، رتبه بهتر'}</p>{rows.length?<ol>{rows.map((row,i)=><li key={row.name}><b>{(i+1).toLocaleString('fa-IR')}</b><span>{row.name}</span><strong>{row.score.toLocaleString('fa-IR')}{game==='reaction'?' ms':''}</strong></li>)}</ol>:<p>اولین رکورد این بازی را ثبت کن.</p>}{arcadeApi&&<button onClick={publish}>ارسال آخرین رکورد من</button>}<p role="status">{message}</p></section>
}
