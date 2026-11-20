import http from 'node:http'
import { randomUUID } from 'node:crypto'
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises'
const players = new Map(), matches = new Map()
const directory = process.env.ARCADE_DATA || './arcade-data'
await mkdir(directory,{recursive:true})
let scores; try { scores=JSON.parse(await readFile(`${directory}/scores.json`,'utf8')) } catch { scores=[] }
let writes=Promise.resolve()
const origin=process.env.ARCADE_ORIGIN || 'http://localhost:4180'
function winner(board) {
  for(let row=0;row<6;row++) for(let col=0;col<7;col++) for(const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]) {
    const value=board[row*7+col]; if(!value)continue
    if(Array.from({length:4},(_,i)=>[row+dr*i,col+dc*i]).every(([r,c])=>r>=0&&r<6&&c>=0&&c<7&&board[r*7+c]===value))return value
  }
  return board.every(Boolean)?'draw':null
}
setInterval(()=>{ const now=Date.now(); for(const [id,p] of players)if(now-p.seen>30000){ const match=matches.get(p.match); if(match&&!match.result)match.result=match.players.find((x)=>x!==id)||'draw'; players.delete(id) } for(const [id,m]of matches)if(m.players.every((p)=>!players.has(p)))matches.delete(id) },10000).unref()
export const server=http.createServer(async(req,res)=>{
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Access-Control-Allow-Origin':origin,'Cache-Control':'no-store'});res.end(JSON.stringify(data))}
  if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'});return res.end()}
  if(req.headers.origin&&req.headers.origin!==origin)return send(403,{error:'Origin rejected'})
  try {
    let body=''; for await(const chunk of req){body+=chunk;if(body.length>4096)return send(413,{error:'درخواست بزرگ است'})}
    const data=body?JSON.parse(body):{}, path=req.url.split('?')[0]
    if(req.method==='GET'&&path==='/scores')return send(200,scores)
    if(req.method==='POST'&&path==='/join'){
      if(players.size>=150)return send(429,{error:'لابی پر است'})
      const name=String(data.name||'').trim().slice(0,32);if(!name)return send(400,{error:'اسم را بنویس'})
      const token=randomUUID();players.set(token,{id:randomUUID(),name,seen:Date.now(),match:null});return send(200,{token})
    }
    if(req.method!=='POST')return send(404,{error:'Not found'})
    const p=players.get(data.token);if(!p)return send(401,{error:'دوباره وارد لابی شو'})
    const now=Date.now();if(p.last&&now-p.last<150)return send(429,{error:'کمی صبر کن'});p.last=now;p.seen=now
    if(path==='/state'){
      const m=matches.get(p.match), publicId=(token)=>players.get(token)?.id || 'disconnected'
      return send(200,{players:[...players.values()].map((v)=>({id:v.id,name:v.name,busy:!!v.match})),me:p.id,match:m?{...m,players:m.players.map(publicId),board:m.board.map((cell)=>cell?publicId(cell):null),turn:publicId(m.turn),result:m.result==='draw'?'draw':m.result?publicId(m.result):null}:null})
    }
    if(path==='/queue'){
      p.waiting=true;const opponent=[...players.entries()].find(([id,v])=>id!==data.token&&v.waiting&&!v.match)
      if(opponent&&!p.match){const id=randomUUID();const tokens=[opponent[0],data.token];matches.set(id,{id,players:tokens,names:tokens.map((t)=>players.get(t).name),board:Array(42).fill(null),turn:tokens[0],result:null});tokens.forEach((t)=>{players.get(t).match=id;players.get(t).waiting=false})}return send(200,{ok:true})
    }
    if(path==='/move'){
      const m=matches.get(p.match),col=data.column
      if(!m||m.result||m.turn!==data.token||!Number.isInteger(col)||col<0||col>6)return send(400,{error:'حرکت معتبر نیست'})
      let row=5;while(row>=0&&m.board[row*7+col])row--;if(row<0)return send(400,{error:'ستون پر است'})
      m.board[row*7+col]=data.token;m.result=winner(m.board);m.turn=m.players.find((t)=>t!==data.token);return send(200,{ok:true})
    }
    if(path==='/leave'){
      const m=matches.get(p.match);if(m&&!m.result)m.result=m.players.find((t)=>t!==data.token);p.match=null;p.waiting=false;return send(200,{ok:true})
    }
    if(path==='/score'){
      if(!['2048','snake','reaction'].includes(data.game)||!Number.isInteger(data.score)||data.score<1||data.score>100000000)return send(400,{error:'امتیاز معتبر نیست'})
      const old=scores.find((s)=>s.name===p.name&&s.game===data.game)
      if(!old)scores.push({name:p.name,game:data.game,score:data.score})
      else if(data.game==='reaction'?data.score<old.score:data.score>old.score)old.score=data.score
      scores=scores.slice(-2000);const snapshot=JSON.stringify(scores);writes=writes.catch(()=>{}).then(async()=>{await writeFile(`${directory}/scores.tmp`,snapshot);await rename(`${directory}/scores.tmp`,`${directory}/scores.json`)});await writes;return send(200,{ok:true})
    }
    send(404,{error:'Not found'})
  }catch{send(400,{error:'درخواست نامعتبر است'})}
})
server.listen(Number(process.env.PORT)||3001,'127.0.0.1',()=>console.log('Arcade listening on 127.0.0.1:'+ (process.env.PORT||3001)))
