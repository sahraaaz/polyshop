import { useState } from 'react'

export default function SupportWidget({ session, messages, onRequireLogin, onSend }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const mine = messages.filter((message) => message.customer === session?.name)
  const toggle = () => { if (!session || session.role !== 'customer') return onRequireLogin(); setOpen((value) => !value) }
  const submit = (event) => { event.preventDefault(); if (!text.trim()) return; onSend(text.trim()); setText('') }
  if (session?.role === 'admin') return null
  return <div className={`support-widget ${open ? 'open' : ''}`}>{open && <section className="support-panel" aria-label="گفتگو با پشتیبانی"><header><span>💬</span><div><b>پشتیبانی Polyshop</b><small>پیامت مستقیم به مدیریت می‌رسه</small></div><button onClick={() => setOpen(false)}>×</button></header><div className="support-messages">{mine.length ? mine.map((message) => <div key={message.id} className={message.from === 'customer' ? 'mine' : 'admin'}><b>{message.from === 'customer' ? 'تو' : 'مدیریت Polyshop'}</b><p>{message.text}</p><small>{message.time}</small></div>) : <div className="support-welcome"><b>سلام! چه کمکی ازمون برمیاد؟</b><span>درباره سفارش، محصول، ژتون یا آگهی پیام بده.</span></div>}</div><form onSubmit={submit}><input value={text} onChange={(event) => setText(event.target.value)} placeholder="پیامت رو بنویس..." autoFocus/><button>ارسال</button></form></section>}<button className="support-fab" onClick={toggle} aria-label="پشتیبانی">{open ? '×' : '💬'}{mine.some((message) => message.from === 'admin' && !message.seen) && <i/>}</button></div>
}
