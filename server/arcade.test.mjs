import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
test('two real clients match, respect turns and finish a game without exposing session tokens', async()=>{
  const directory=await mkdtemp(join(tmpdir(),'poly-arcade-test-'))
  process.env.ARCADE_DATA=directory;process.env.PORT='3199'
  const {server}=await import('./arcade.mjs')
  if(!server.listening)await new Promise((resolve)=>server.once('listening',resolve))
  const post=async(path,body)=>{const response=await fetch('http://127.0.0.1:3199'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return{status:response.status,data:await response.json()}}
  const pause=()=>new Promise((resolve)=>setTimeout(resolve,170))
  try{
    const a=(await post('/join',{name:'Test A'})).data.token,b=(await post('/join',{name:'Test B'})).data.token
    await post('/queue',{token:a});await post('/queue',{token:b});await pause()
    let state=(await post('/state',{token:a})).data
    assert.equal(state.match.board.length,42);assert(!JSON.stringify(state).includes(a));assert(!JSON.stringify(state).includes(b))
    await pause();assert.equal((await post('/move',{token:b,column:0})).status,400)
    for(const[token,column]of [[a,0],[b,1],[a,0],[b,1],[a,0],[b,1],[a,0]]){await pause();assert.equal((await post('/move',{token,column})).status,200)}
    await pause();state=(await post('/state',{token:a})).data;assert.equal(state.match.result,state.me)
    await pause();assert.equal((await post('/score',{token:a,game:'snake',score:50})).status,200)
    assert.equal((await(await fetch('http://127.0.0.1:3199/scores')).json())[0].score,50)
  }finally{await new Promise((resolve)=>server.close(resolve));await rm(directory,{recursive:true})}
})
