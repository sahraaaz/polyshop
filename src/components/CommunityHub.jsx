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
  return <form className="idea-composer reddit-composer" onSubmit={submit}><div className="idea-compose-head"><div><span>CREATE A POST</span><h3>پست تازه در r/polyclub</h3></div><button type="button" onClick={onCancel}>انصراف</button></div><label>عنوان<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="یک عنوان واضح و کوتاه..." autoFocus/></label><label>فلر پست<select value={form.product} onChange={(event) => setForm({ ...form, product: event.target.value })}><option>تیشرت</option><option>هودی</option><option>توت‌بگ</option><option>پیکسل</option><option>پوستر</option></select></label><label className="wide">متن پست<textarea rows="4" value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} placeholder="ایده، جمله، رنگ و حس کلی طرح را توضیح بده..."/></label><label className="wide idea-image-input">تصویر یا اسکچ اختیاری<input type="file" accept="image/*" onChange={addImage}/>{form.image && <img src={form.image} alt="پیش‌نمایش طرح"/>}</label><div className="form-message error wide">{error}</div><button className="idea-submit wide" type="submit">Post</button></form>
}

function IdeaPost({ idea, rank, session, onRequireLogin, onLike, onComment, onLikeComment }) {
  const [comment, setComment] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [downvoted, setDownvoted] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const liked = idea.likes?.includes(session?.name)
  const comments = idea.comments || []
  const submitComment = (event) => { event.preventDefault(); if (!session) return onRequireLogin(); if (!comment.trim()) return; onComment(idea.id, comment.trim()); setComment('') }
  const upvote = () => { if (!session) return onRequireLogin(); setDownvoted(false); onLike(idea.id) }
  const downvote = () => { if (!session) return onRequireLogin(); if (liked) onLike(idea.id); setDownvoted((value) => !value) }
  const share = async () => { await navigator.clipboard?.writeText(`${idea.title} — Poly Club`); setCopied(true); window.setTimeout(() => setCopied(false), 1400) }
  return <article className={`reddit-post ${idea.selected ? 'selected' : ''}`}>
    <div className="reddit-vote"><button className={liked ? 'liked' : ''} onClick={upvote} aria-label="رأی مثبت">▲</button><b>{fa((idea.likes?.length || 0) - (downvoted ? 1 : 0))}</b><button className={downvoted ? 'downvoted' : ''} onClick={downvote} aria-label="رأی منفی">▼</button></div>
    <div className="reddit-post-main">
      <div className="reddit-post-meta"><span className="post-flair">{idea.product}</span><span>ارسال‌شده توسط <b>u/{idea.author}</b></span><span>· {rank === 0 ? 'داغ‌ترین پست امروز' : `${fa(rank + 1)} ساعت پیش`}</span></div>
      <div className="reddit-post-content"><div><h3>{idea.title}</h3><p>{idea.body}</p></div>{idea.image ? <img className="reddit-thumb" src={idea.image} alt="طرح پیشنهادی"/> : <div className="reddit-thumb reddit-placeholder"><small>{idea.product}</small><b>{idea.title.slice(0, 2)}</b></div>}</div>
      {idea.selected && <div className="print-pick">✦ انتخاب تیم Polyshop برای چاپ</div>}
      <div className="reddit-actions"><button onClick={() => setExpanded((value) => !value)}>▰ {fa(comments.length)} نظر</button><button onClick={share}>↗ {copied ? 'کپی شد' : 'اشتراک'}</button><button onClick={() => setSaved((value) => !value)}>{saved ? '★ ذخیره شد' : '☆ ذخیره'}</button></div>
      {expanded && <div className="reddit-thread"><form onSubmit={submitComment}><input value={comment} onChange={(event) => setComment(event.target.value)} placeholder={session ? 'نظر تو چیست؟' : 'برای نوشتن نظر وارد شو'}/><button>ثبت نظر</button></form>{comments.length ? comments.map((item) => <div className="reddit-comment" key={item.id}><div className="comment-line"/><p><b>u/{item.author}</b><small> · همین امروز</small><span>{item.text}</span><button className={item.likes?.includes(session?.name) ? 'liked' : ''} onClick={() => session ? onLikeComment(idea.id, item.id) : onRequireLogin()}>▲ {fa(item.likes?.length || 0)}</button></p></div>) : <p className="no-comments">هنوز نظری نیست؛ شروع‌کننده بحث باش.</p>}</div>}
    </div>
  </article>
}

export default function CommunityHub({ standalone = false, session, tier, ideas, messages, onBack, onRequireLogin, onAddIdea, onLikeIdea, onCommentIdea, onLikeComment, onSendMessage }) {
  const [composer, setComposer] = useState(false)
  const [chatText, setChatText] = useState('')
  const [sort, setSort] = useState('hot')
  const visibleIdeas = useMemo(() => [...ideas].filter((idea) => idea.status !== 'hidden'), [ideas])
  const sortedIdeas = useMemo(() => visibleIdeas.sort((a, b) => {
    if (sort === 'new') return String(b.id).localeCompare(String(a.id))
    if (sort === 'top') return (b.likes?.length || 0) - (a.likes?.length || 0)
    return ((b.likes?.length || 0) * 3 + (b.comments?.length || 0)) - ((a.likes?.length || 0) * 3 + (a.comments?.length || 0))
  }), [visibleIdeas, sort])
  const sendChat = (event) => { event.preventDefault(); if (!session) return onRequireLogin(); if (!chatText.trim()) return; onSendMessage(chatText.trim()); setChatText('') }
  const totalVotes = ideas.reduce((sum, idea) => sum + (idea.likes?.length || 0), 0)

  return <section className={`community-section reddit-community ${standalone ? 'standalone' : ''}`} id="community">
    {standalone && <><div className="reddit-banner"><button className="club-back" onClick={onBack}>→ فروشگاه</button><span>POLY CLUB</span></div><div className="subreddit-head"><div className="subreddit-avatar">P/</div><div><h1>Poly Club</h1><p>r/polyclub · ایده‌ها، طرح‌ها و حرف‌های بچه‌های پلی‌تکنیک</p></div><button onClick={() => session ? setComposer(true) : onRequireLogin()}>+ ساخت پست</button></div></>}
    {composer && (
      <IdeaComposer onCancel={() => setComposer(false)} onSubmit={(data) => { onAddIdea(data); setComposer(false) }}/>
    )}
    <div className="reddit-layout"><main className="reddit-feed"><div className="reddit-create" onClick={() => session ? setComposer(true) : onRequireLogin()}><span>{session ? tier.avatar : '🙂'}</span><button>یک پست بساز...</button><i>▧</i><i>🔗</i></div><div className="reddit-sort"><button className={sort === 'hot' ? 'active' : ''} onClick={() => setSort('hot')}>🔥 داغ</button><button className={sort === 'new' ? 'active' : ''} onClick={() => setSort('new')}>✦ جدید</button><button className={sort === 'top' ? 'active' : ''} onClick={() => setSort('top')}>▲ برترین</button><span>•••</span></div><div className="reddit-post-list">{sortedIdeas.map((idea, index) => <IdeaPost key={idea.id} rank={index} idea={idea} session={session} onRequireLogin={onRequireLogin} onLike={onLikeIdea} onComment={onCommentIdea} onLikeComment={onLikeComment}/>)}</div></main>
      <aside className="reddit-sidebar"><section className="subreddit-about"><header>درباره انجمن</header><div><p>جایی برای ایده‌های مرچ، طرح‌های تازه و چیزهایی که دوست داریم در Polyshop ساخته شوند.</p><div className="subreddit-numbers"><span><b>{fa(ideas.length)}</b> عضو ایده‌پرداز</span><span><b>{fa(totalVotes)}</b> رأی جامعه</span></div><small>● {fa(Math.max(3, messages.length))} نفر آنلاین</small><button onClick={() => session ? setComposer(true) : onRequireLogin()}>ساخت پست</button></div></section><section className="subreddit-rules"><header>قوانین r/polyclub</header><ol><li><b>۱</b>محترمانه و دانشجویی بمان.</li><li><b>۲</b>ایده را واضح توضیح بده.</li><li><b>۳</b>کپی بدون ذکر منبع ممنوع.</li><li><b>۴</b>رأی واقعی؛ نه اسپم.</li></ol></section><section className="group-chat reddit-chat"><div className="group-chat-head"><span className="live-dot"/><div><b>چت زنده Poly Club</b><small>{session ? `${tier.avatar} ${tier.title}` : 'برای نوشتن وارد شو'}</small></div></div><div className="group-messages">{messages.slice(-8).map((message) => <div key={message.id} className={message.author === session?.name ? 'mine' : ''}><span>{message.avatar || '🙂'}</span><p><b>{message.author}</b>{message.text}<small>{message.time}</small></p></div>)}</div><form onSubmit={sendChat}><input value={chatText} onChange={(event) => setChatText(event.target.value)} placeholder="پیام برای همه..."/><button>↵</button></form></section></aside>
    </div>
  </section>
}
