import { useMemo, useState } from 'react'

const fa = (value) => new Intl.NumberFormat('fa-IR').format(value)

function IdeaComposer({ onSubmit, onCancel }) {
  const [form, setForm] = useState({ title: '', body: '', product: 'تیشرت', image: '' })
  const [error, setError] = useState('')
  const addImage = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 650000) return setError('تصویر باید کمتر از ۶۵۰ کیلوبایت باشد.')
    const reader = new FileReader()
    reader.onload = () => setForm((prev) => ({ ...prev, image: reader.result }))
    reader.readAsDataURL(file)
  }
  const submit = (event) => {
    event.preventDefault()
    if (form.title.trim().length < 4 || form.body.trim().length < 8) return setError('عنوان و توضیح کامل‌تری بنویس.')
    onSubmit({ ...form, title: form.title.trim(), body: form.body.trim() })
  }
  return <form className="idea-composer" onSubmit={submit}><div className="idea-compose-head"><div><span>NEW DROP IDEA</span><h3>ایده‌ات را بنداز وسط</h3></div><button type="button" onClick={onCancel}>بستن</button></div><label>عنوان ایده<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="مثلاً هودی شب‌های سایت" autoFocus/></label><label>برای چی چاپ شود؟<select value={form.product} onChange={(event) => setForm({ ...form, product: event.target.value })}><option>تیشرت</option><option>هودی</option><option>توت‌بگ</option><option>پیکسل</option><option>پوستر</option></select></label><label className="wide">توضیح طرح<textarea rows="3" value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} placeholder="ایده، جمله، رنگ و حس کلی طرح را توضیح بده..."/></label><label className="wide idea-image-input">تصویر یا اسکچ اختیاری<input type="file" accept="image/*" onChange={addImage}/>{form.image && <img src={form.image} alt="پیش‌نمایش طرح"/>}</label><div className="form-message error wide">{error}</div><button className="idea-submit wide" type="submit">انتشار برای رأی‌گیری</button></form>
}

function IdeaCard({ idea, session, onRequireLogin, onLike, onComment, onLikeComment }) {
  const [comment, setComment] = useState('')
  const liked = idea.likes?.includes(session?.name)
  const submitComment = (event) => { event.preventDefault(); if (!session) return onRequireLogin(); if (!comment.trim()) return; onComment(idea.id, comment.trim()); setComment('') }
  return <article className={`idea-card ${idea.selected ? 'selected' : ''}`}>{idea.selected && <div className="print-pick">انتخاب‌شده برای چاپ ✦</div>}{idea.image ? <img className="idea-cover" src={idea.image} alt="طرح پیشنهادی"/> : <div className="idea-cover idea-placeholder"><span>{idea.product}</span><b>{idea.title.slice(0, 2)}</b></div>}<div className="idea-card-body"><div className="idea-meta"><span>{idea.product}</span><small>{idea.author}</small></div><h3>{idea.title}</h3><p>{idea.body}</p><div className="idea-actions"><button className={liked ? 'liked' : ''} onClick={() => session ? onLike(idea.id) : onRequireLogin()}>♥ <b>{fa(idea.likes?.length || 0)}</b></button><span>{fa(idea.comments?.length || 0)} نظر</span></div><div className="idea-comments">{(idea.comments || []).slice(-2).map((item) => <p key={item.id}><b>{item.author}</b><span>{item.text}</span><button className={item.likes?.includes(session?.name) ? 'liked' : ''} onClick={() => session ? onLikeComment(idea.id, item.id) : onRequireLogin()}>♥ {fa(item.likes?.length || 0)}</button></p>)}</div><form onSubmit={submitComment}><input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="یک نظر کوتاه و باحال..."/><button>ارسال</button></form></div></article>
}

export default function CommunityHub({ standalone = false, session, tier, ideas, messages, onBack, onRequireLogin, onAddIdea, onLikeIdea, onCommentIdea, onLikeComment, onSendMessage }) {
  const [composer, setComposer] = useState(false)
  const [chatText, setChatText] = useState('')
  const sortedIdeas = useMemo(() => [...ideas].filter((idea) => idea.status !== 'hidden').sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0)), [ideas])
  const sendChat = (event) => { event.preventDefault(); if (!session) return onRequireLogin(); if (!chatText.trim()) return; onSendMessage(chatText.trim()); setChatText('') }
  return <section className={`community-section ${standalone ? 'standalone' : ''}`} id="community">{standalone && <div className="club-intro"><button className="club-back" onClick={onBack}>→ برگشت به فروشگاه</button><span className="section-tag">POLY CLUB / COMMUNITY</span><h1>اینجا طرح‌ها قبل از چاپ<br/><em>زندگی می‌گیرند.</em></h1><p>یک فضای مستقل برای ایده‌ها، رأی‌گیری و گفت‌وگوی دانشجوها؛ نه یک فید شلوغ و بی‌انتها.</p><div className="club-stats"><span><b>{fa(ideas.length)}</b> ایده</span><span><b>{fa(ideas.reduce((sum, idea) => sum + (idea.likes?.length || 0), 0))}</b> رأی</span><span><b>●</b> گفت‌وگوی زنده</span></div></div>}<header className="community-head"><div><span className="section-tag">CURATED IDEAS</span><h2>ویترین ایده‌ها</h2><p>به ایده‌هایی رأی بده که واقعاً دوست داری در دراپ بعدی Polyshop ببینی.</p></div><button onClick={() => session ? setComposer(true) : onRequireLogin()}>+ ثبت ایده تازه</button></header>{composer && <IdeaComposer onCancel={() => setComposer(false)} onSubmit={(data) => { onAddIdea(data); setComposer(false) }}/>}<div className="community-layout"><div><div className="community-sort"><b>طرح‌های منتخب جامعه</b><span>مرتب‌شده براساس رأی دانشجوها</span></div><div className="idea-grid">{sortedIdeas.map((idea) => <IdeaCard key={idea.id} idea={idea} session={session} onRequireLogin={onRequireLogin} onLike={onLikeIdea} onComment={onCommentIdea} onLikeComment={onLikeComment}/>)}</div></div><aside className="group-chat"><div className="group-chat-head"><span className="live-dot"/><div><b>گفت‌وگوی Poly Club</b><small>{session ? `${tier.avatar} ${tier.title}` : 'برای نوشتن وارد شو'}</small></div></div><div className="group-messages">{messages.slice(-18).map((message) => <div key={message.id} className={message.author === session?.name ? 'mine' : ''}><span>{message.avatar || '🙂'}</span><p><b>{message.author}</b>{message.text}<small>{message.time}</small></p></div>)}</div><form onSubmit={sendChat}><input value={chatText} onChange={(event) => setChatText(event.target.value)} placeholder="پیام برای همه..."/><button>↵</button></form></aside></div></section>
}
