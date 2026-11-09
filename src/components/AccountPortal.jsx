import { useMemo, useState } from 'react'

const format = (value) => `${new Intl.NumberFormat('fa-IR').format(Number(value) || 0)} تومان`
const fa = (value) => new Intl.NumberFormat('fa-IR').format(value)
const tradeLabels = { sale: 'فروش', rent: 'اجاره', swap: 'معاوضه', free: 'رایگان', auction: 'مزایده' }
const statusLabels = { pending: 'در انتظار بررسی', approved: 'تأییدشده', rejected: 'ردشده', resolved: 'رسیدگی‌شده' }

const emptyProduct = {
  title: '', category: 'سایر', price: '', stock: 1, color: '', blurb: '', source: 'student', discount: 0,
  tone: 'turquoise', art: 'book', badge: '', productType: 'physical', tradeType: 'sale',
  deliveryMethods: ['pickup'], pickupLocation: 'دانشگاه صنعتی امیرکبیر', serviceMode: 'online',
  turnaround: '۳ روز', courseCode: '', professor: '', isbn: '', availableSlots: 'شنبه تا چهارشنبه، ۱۶ تا ۲۰', auctionEndsAt: '', minBidStep: 50000, images: [],
}

function ProductForm({ session, initial, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({ ...emptyProduct, ...initial, auctionEndsAt: initial?.auctionEndsAt ? new Date(initial.auctionEndsAt).toISOString().slice(0, 16) : '', deliveryMethods: initial?.deliveryMethods || ['pickup'] }))
  const [error, setError] = useState('')
  const admin = session.role === 'admin'
  const update = (key, value) => { setForm((prev) => ({ ...prev, [key]: value })); setError('') }
  const submit = (event) => {
    event.preventDefault()
    const needsPrice = !['swap', 'free'].includes(form.tradeType)
    if (!form.title.trim() || (needsPrice && Number(form.price) <= 0) || Number(form.stock) < 0 || !form.blurb.trim()) return setError('عنوان، توضیحات، موجودی و قیمت معتبر را کامل کن.')
    if (form.productType === 'physical' && !form.deliveryMethods.length) return setError('حداقل یک روش دریافت انتخاب کن.')
    if (form.tradeType === 'auction' && (!form.auctionEndsAt || new Date(form.auctionEndsAt).getTime() <= Date.now())) return setError('زمان پایان مزایده باید در آینده باشد.')
    onSave({ ...form, title: form.title.trim(), price: needsPrice ? Number(form.price) : 0, stock: Number(form.stock), discount: Number(form.discount) || 0, auctionEndsAt: form.tradeType === 'auction' ? new Date(form.auctionEndsAt).getTime() : null, minBidStep: Number(form.minBidStep) || 50000, seller: admin ? (form.source === 'official' ? 'Polyshop' : form.seller || 'ثبت‌شده توسط مدیریت') : session.name, status: admin ? 'approved' : 'pending', subtitle: form.subtitle || 'POLYSHOP Listing', art: form.productType === 'service' ? 'poster' : form.art || 'book' })
  }
  const toggleDelivery = (method) => setForm((prev) => ({ ...prev, deliveryMethods: prev.deliveryMethods.includes(method) ? prev.deliveryMethods.filter((item) => item !== method) : [...prev.deliveryMethods, method] }))
  const addImages = async (event) => {
    const files = [...event.target.files].filter((file) => file.size <= 500000).slice(0, Math.max(0, 4 - (form.images?.length || 0)))
    const encoded = await Promise.all(files.map((file) => new Promise((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(file) })))
    setForm((prev) => ({ ...prev, images: [...(prev.images || []), ...encoded].slice(0, 4) }))
  }

  return <div className="portal-form-wrap">
    <div className="portal-form-head"><div><span className="section-tag">NEW LISTING</span><h3>{initial ? 'ویرایش محصول یا خدمت' : admin ? 'افزودن مورد جدید' : 'ثبت آگهی جدید'}</h3></div><button type="button" onClick={onCancel}>بستن</button></div>
    <form className="product-form" onSubmit={submit}>
      {admin && <label className="wide">نوع فروشگاه<span>این مورد کجا نمایش داده شود؟</span><select value={form.source} onChange={(e) => update('source', e.target.value)}><option value="official">فروشگاه رسمی Polyshop</option><option value="student">بازار دانشجویی</option></select></label>}
      <fieldset className="product-kind wide"><legend>نوع مورد</legend><button type="button" className={form.productType === 'physical' ? 'active' : ''} onClick={() => update('productType', 'physical')}>کالای فیزیکی<small>کتاب، لباس، ابزار و مرچ</small></button><button type="button" className={form.productType === 'service' ? 'active' : ''} onClick={() => { setForm((prev) => ({ ...prev, productType: 'service', tradeType: 'sale' })); setError('') }}>خدمت<small>آموزش، طراحی و مشاوره</small></button></fieldset>
      {form.productType === 'physical' && <fieldset className="trade-choice wide"><legend>نوع معامله</legend>{Object.entries(tradeLabels).map(([value, label]) => <button type="button" key={value} className={form.tradeType === value ? 'active' : ''} onClick={() => update('tradeType', value)}>{label}</button>)}</fieldset>}
      <label>نام محصول یا خدمت<input value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="مثلاً کتاب کنترل پروژه" required/></label>
      <label>دسته‌بندی<input value={form.category} onChange={(e) => update('category', e.target.value)} placeholder="کتاب و جزوه" required/></label>
      {!['swap', 'free'].includes(form.tradeType) && <label>قیمت {form.tradeType === 'rent' ? 'اجاره' : ''} (تومان)<input type="number" min="1000" step="1000" value={form.price} onChange={(e) => update('price', e.target.value)} required/></label>}
      {form.tradeType === 'auction' && <><label>پایان مزایده<input type="datetime-local" value={form.auctionEndsAt} onChange={(e) => update('auctionEndsAt', e.target.value)} required/></label><label>حداقل گام پیشنهاد<input type="number" min="10000" step="10000" value={form.minBidStep} onChange={(e) => update('minBidStep', e.target.value)} required/></label></>}
      <label>موجودی<input type="number" min="0" value={form.stock} onChange={(e) => update('stock', e.target.value)} required/></label>
      <label>وضعیت یا رنگ<input value={form.color} onChange={(e) => update('color', e.target.value)} placeholder="سالم، بدون خط‌خوردگی"/></label>
      {admin && <label>تخفیف درصدی<input type="number" min="0" max="90" value={form.discount} onChange={(e) => update('discount', e.target.value)}/></label>}
      <label className="wide image-upload">تصاویر<span>حداکثر ۴ تصویر؛ هر فایل کمتر از ۵۰۰ کیلوبایت</span><input type="file" accept="image/*" multiple onChange={addImages}/>{form.images?.length > 0 && <div className="image-previews">{form.images.map((image, index) => <span key={`${image.slice(-20)}-${index}`}><img src={image} alt={`پیش‌نمایش ${index + 1}`}/><button type="button" aria-label="حذف تصویر" onClick={() => update('images', form.images.filter((_, i) => i !== index))}>×</button></span>)}</div>}</label>
      {form.productType === 'physical' ? <>
        <fieldset className="delivery-choice wide"><legend>روش دریافت</legend><label><input type="checkbox" checked={form.deliveryMethods.includes('pickup')} onChange={() => toggleDelivery('pickup')}/><span>تحویل حضوری در دانشگاه</span></label><label><input type="checkbox" checked={form.deliveryMethods.includes('shipping')} onChange={() => toggleDelivery('shipping')}/><span>ارسال به آدرس خریدار</span></label></fieldset>
        {form.deliveryMethods.includes('pickup') && <label className="wide">محل تحویل حضوری<input value={form.pickupLocation} onChange={(e) => update('pickupLocation', e.target.value)} placeholder="مثلاً ورودی دانشکده صنایع"/></label>}
        {(form.category.includes('کتاب') || form.art === 'book') && <div className="book-fields wide"><label>کد درس<input value={form.courseCode} onChange={(e) => update('courseCode', e.target.value)} placeholder="مثلاً IE-204"/></label><label>نام استاد<input value={form.professor} onChange={(e) => update('professor', e.target.value)} placeholder="اختیاری"/></label><label>ISBN<input value={form.isbn} onChange={(e) => update('isbn', e.target.value)} placeholder="اختیاری"/></label></div>}
      </> : <>
        <label>شیوه ارائه<select value={form.serviceMode} onChange={(e) => update('serviceMode', e.target.value)}><option value="online">جلسه آنلاین</option><option value="file">تحویل فایل</option><option value="inperson">جلسه حضوری</option></select></label>
        <label>زمان انجام<input value={form.turnaround} onChange={(e) => update('turnaround', e.target.value)} placeholder="مثلاً ۳ روز"/></label>
        <label className="wide">زمان‌های قابل رزرو<input value={form.availableSlots} onChange={(e) => update('availableSlots', e.target.value)} placeholder="مثلاً شنبه و دوشنبه، ۱۸ تا ۲۰"/></label>
        <div className="academic-notice wide"><b>مرز خدمات دانشگاهی</b><span>مشاوره، آموزش، تحلیل آماری، ویرایش و بازخورد مجاز است؛ انجام پایان‌نامه، مقاله یا تکلیف به‌جای دانشجو منتشر نمی‌شود.</span></div>
      </>}
      <label className="wide">توضیحات<textarea rows="4" value={form.blurb} onChange={(e) => update('blurb', e.target.value)} placeholder="وضعیت دقیق و هر نکته‌ای که خریدار باید بداند..." required/></label>
      <div className="form-notice wide">{admin ? 'مورد مدیریتی بلافاصله منتشر می‌شود.' : 'پس از ثبت، مدیریت آن را بررسی می‌کند و نتیجه در حساب تو می‌ماند.'}</div>
      <div className="form-message error wide" role="alert">{error}</div>
      <button className="portal-primary wide" type="submit">{initial ? 'ذخیره تغییرات' : admin ? 'افزودن و انتشار' : 'ارسال برای بررسی'}</button>
    </form>
  </div>
}

function ManageRow({ product, admin, readOnly = false, onApprove, onReject, onEdit, onDelete }) {
  const price = Math.round(product.price * (1 - (product.discount || 0) / 100))
  return <article className="manage-row"><div className={`mini-art tone-${product.tone || 'turquoise'}`}>{product.art === 'book' ? 'BOOK' : product.art === 'calc' ? '123' : 'B!'}</div><div className="manage-info"><div><span className={`status-pill ${product.status}`}>{statusLabels[product.status] || 'منتشرشده'}</span><span>{product.source === 'official' ? 'فروشگاه رسمی' : 'بازار دانشجویی'}</span><span>{tradeLabels[product.tradeType || 'sale']}</span></div><h4>{product.title}</h4><p>{product.seller} · {product.category} · موجودی {fa(product.stock)}</p></div><div className="manage-price">{product.tradeType === 'free' ? <strong>رایگان</strong> : product.tradeType === 'swap' ? <strong>معاوضه</strong> : <>{product.discount > 0 && <small>{format(product.price)}</small>}<strong>{format(price)}</strong>{product.discount > 0 && <b>{fa(product.discount)}٪ تخفیف</b>}</>}</div>{!readOnly && <div className="manage-actions">{admin && product.status === 'pending' && <><button className="approve" onClick={() => onApprove(product.id)}>تأیید</button><button onClick={() => onReject(product.id)}>رد</button></>}<button onClick={() => onEdit(product)}>ویرایش</button><button className="danger" onClick={() => onDelete(product.id)}>حذف</button></div>}</article>
}

const orderLabels = { paid: 'پرداخت‌شده', processing: 'در حال آماده‌سازی', delivered: 'منتظر تأیید خریدار', completed: 'تکمیل‌شده' }
function OrderRow({ order, session, onAdvance }) {
  const admin = session.role === 'admin', sellerSide = admin || order.seller === session.name, buyerSide = order.buyer === session.name
  const [handoff, setHandoff] = useState('')
  const nextLabel = sellerSide && order.status === 'paid' ? 'شروع آماده‌سازی' : sellerSide && order.status === 'processing' ? 'ثبت تحویل/ارسال' : buyerSide && order.status === 'delivered' ? 'تأیید دریافت' : admin && order.status === 'delivered' ? 'تکمیل مدیریتی' : ''
  const needsCode = sellerSide && order.status === 'processing' && order.fulfillment === 'pickup'
  return <article className="order-row"><div><span className={`status-pill ${order.status}`}>{orderLabels[order.status]}</span><small>{order.id}</small><h4>{order.productTitle}</h4><p>{order.seller} ← {order.buyer}</p></div><div className="order-fulfillment"><small>روش دریافت</small><b>{order.fulfillment === 'shipping' ? 'ارسال به آدرس' : order.fulfillment === 'pickup' ? 'تحویل دانشگاه' : 'خدمت'}</b>{order.pickupSlot && <span>{order.pickupSlot}</span>}{order.address && <span>{order.address}</span>}{order.handoffCode && buyerSide && order.status !== 'completed' && <strong className="handoff-code">کد تحویل: {order.handoffCode}</strong>}{needsCode && <label className="handoff-entry">کد خریدار<input inputMode="numeric" maxLength="4" value={handoff} onChange={(event) => setHandoff(event.target.value.replace(/\D/g, ''))} placeholder="۴ رقم"/></label>}</div><div className="order-money"><strong>{format(order.amount)}</strong><small>{order.status === 'completed' ? 'قابل تسویه' : 'در انتظار تسویه'}</small></div>{nextLabel && <button disabled={needsCode && handoff.length !== 4} onClick={() => onAdvance(order.id, handoff)}>{needsCode ? 'تأیید کد و تحویل' : nextLabel}</button>}</article>
}

function ReviewRow({ review, product, admin, onModerate, onDelete }) {
  return <article className="moderation-row"><div><div className="rating-stars" aria-label={`${review.rating} از ۵`}>{'★★★★★'.slice(0, review.rating)}<i>{'★★★★★'.slice(review.rating)}</i></div><h4>{product?.title || 'محصول حذف‌شده'}</h4><p>{review.text}</p><small>{review.author} · {review.verified ? 'خرید تأییدشده' : 'نظر دانشجویی'}</small></div><span className={`status-pill ${review.status}`}>{statusLabels[review.status]}</span><div className="manage-actions">{admin && review.status === 'pending' && <><button className="approve" onClick={() => onModerate(review.id, 'approved')}>تأیید</button><button onClick={() => onModerate(review.id, 'rejected')}>رد</button></>}<button className="danger" onClick={() => onDelete(review.id)}>حذف</button></div></article>
}

function OfferRow({ offer, product, session, onStatus }) {
  const canDecide = session.role === 'admin' || product?.seller === session.name
  return <article className="moderation-row"><div><h4>{product?.title || 'محصول حذف‌شده'}</h4><p><b>{offer.buyer}</b> پیشنهاد داده: {offer.kind === 'reserve' ? 'رزرو دو ساعته' : format(offer.amount)}</p><small>{offer.message || 'بدون توضیح'}</small></div><span className={`status-pill ${offer.status}`}>{offer.status === 'pending' ? 'منتظر پاسخ' : offer.status === 'accepted' ? 'پذیرفته' : offer.status === 'cancelled' ? 'لغوشده' : 'ردشده'}</span>{canDecide && offer.status === 'pending' && <div className="manage-actions"><button className="approve" onClick={() => onStatus(offer.id, 'accepted')}>پذیرش</button><button onClick={() => onStatus(offer.id, 'rejected')}>رد</button></div>}{canDecide && offer.kind === 'reserve' && offer.status === 'accepted' && <div className="manage-actions"><button className="danger" onClick={() => onStatus(offer.id, 'cancelled')}>لغو رزرو</button></div>}</article>
}

function ReportRow({ report, product, admin, onStatus, onDeleteProduct }) {
  return <article className="moderation-row"><div><h4>{product?.title || 'محصول حذف‌شده'}</h4><p>{report.reason}</p><small>گزارش‌دهنده: {report.author}</small></div><span className={`status-pill ${report.status}`}>{report.status === 'pending' ? 'باز' : 'رسیدگی‌شده'}</span>{admin && report.status === 'pending' && <div className="manage-actions"><button className="approve" onClick={() => onStatus(report.id, 'resolved')}>بستن گزارش</button>{product && <button className="danger" onClick={() => { onDeleteProduct(product.id); onStatus(report.id, 'resolved') }}>حذف آگهی</button>}</div>}</article>
}

function CouponManager({ coupons, onAdd, onToggle }) {
  const [form, setForm] = useState({ code: '', amount: '', label: '', oneTime: true })
  const generate = () => setForm((prev) => ({ ...prev, code: `BF-${Math.random().toString(36).slice(2, 7).toUpperCase()}` }))
  const submit = (event) => { event.preventDefault(); onAdd(form); setForm({ code: '', amount: '', label: '', oneTime: true }) }
  return <div className="coupon-manager"><form onSubmit={submit}><div><span className="section-tag">ONE-TIME TOKEN</span><h3>ساخت ژتون مسابقه</h3></div><label>کد<div className="code-generator"><input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} placeholder="IE1405" required/><button type="button" onClick={generate}>تولید خودکار</button></div></label><label>مبلغ (تومان)<input type="number" min="1000" step="1000" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required/></label><label>عنوان<input value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} placeholder="جایزه مسابقه"/></label><label className="one-time-check"><input type="checkbox" checked={form.oneTime} onChange={(event) => setForm({ ...form, oneTime: event.target.checked })}/><span>بعد از اولین استفاده در کل فروشگاه غیرفعال شود</span></label><button type="submit">ساخت و فعال‌سازی</button></form><div className="coupon-admin-list">{Object.entries(coupons).map(([code, item]) => <article key={code}><div><code>{code}</code><b>{item.label}</b><small>{format(item.amount)} · {item.oneTime ? 'یک‌بارمصرف' : 'عمومی'} · {fa(item.usedCount || 0)} استفاده</small></div><span className={`status-pill ${item.active === false ? 'rejected' : 'approved'}`}>{item.active === false ? 'غیرفعال' : 'فعال'}</span><button onClick={() => onToggle(code)}>{item.active === false ? 'فعال‌کردن' : 'غیرفعال‌کردن'}</button></article>)}</div></div>
}

function AuctionManager({ session, catalog, bids, onCloseAuction }) {
  const admin = session.role === 'admin'
  const auctions = catalog.filter((product) => product.tradeType === 'auction' && (admin || product.seller === session.name || bids.some((bid) => bid.productId === product.id && bid.bidder === session.name)))
  return <div className="auction-admin-list">{auctions.length ? auctions.map((product) => { const productBids = bids.filter((bid) => bid.productId === product.id).sort((a, b) => b.amount - a.amount), ended = Date.now() >= product.auctionEndsAt, winner = productBids[0]; return <article key={product.id}><div className="auction-admin-main"><span className={`status-pill ${ended ? 'completed' : 'processing'}`}>{ended ? 'پایان‌یافته' : 'درحال برگزاری'}</span><h3>{product.title}</h3><p>{product.seller} · پایان: {new Date(product.auctionEndsAt).toLocaleString('fa-IR')}</p></div><div><small>بالاترین پیشنهاد</small><b>{format(winner?.amount || product.price)}</b><span>{fa(productBids.length)} پیشنهاد</span></div><div><small>{ended ? 'برنده' : 'نفر اول فعلی'}</small><b>{winner?.bidder || 'هنوز کسی نیست'}</b></div>{admin && !ended && <button onClick={() => onCloseAuction(product.id)}>پایان‌دادن مزایده</button>}</article> }) : <Empty text="هنوز مزایده‌ای وجود ندارد."/>}</div>
}

function SupportInbox({ messages, onReply }) {
  const customers = [...new Set(messages.map((message) => message.customer))]
  const [active, setActive] = useState(customers[0] || '')
  const [text, setText] = useState('')
  const thread = messages.filter((message) => message.customer === active)
  const submit = (event) => { event.preventDefault(); if (!text.trim() || !active) return; onReply(active, text.trim()); setText('') }
  return <div className="support-inbox"><aside>{customers.length ? customers.map((customer) => <button key={customer} className={active === customer ? 'active' : ''} onClick={() => setActive(customer)}><span>{customer.slice(0, 1)}</span><div><b>{customer}</b><small>{messages.filter((message) => message.customer === customer).at(-1)?.text}</small></div></button>) : <p>هنوز پیامی نرسیده.</p>}</aside><section>{active ? <><header><b>{active}</b><span>{fa(thread.length)} پیام</span></header><div>{thread.map((message) => <article key={message.id} className={message.from}><b>{message.from === 'admin' ? 'مدیریت' : active}</b><p>{message.text}</p><small>{message.time}</small></article>)}</div><form onSubmit={submit}><input value={text} onChange={(event) => setText(event.target.value)} placeholder="پاسخ مدیریت..."/><button>ارسال پاسخ</button></form></> : <Empty text="یک گفتگو را انتخاب کن."/>}</section></div>
}

function CommunityAdmin({ ideas, messages, onUpdateIdea, onDeleteIdea, onDeleteMessage }) {
  const sorted = [...ideas].sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0))
  return <div className="community-admin"><section><header><div><span className="section-tag">TOP DESIGNS</span><h3>رتبه‌بندی طرح‌ها</h3></div><b>{fa(ideas.length)} پست</b></header>{sorted.map((idea, index) => <article key={idea.id}><span className="idea-rank">#{fa(index + 1)}</span><div><h4>{idea.title}</h4><p>{idea.author} · {idea.product}</p></div><b>♥ {fa(idea.likes?.length || 0)}</b><div className="manage-actions"><button className="approve" onClick={() => onUpdateIdea(idea.id, { selected: !idea.selected })}>{idea.selected ? 'لغو انتخاب' : 'انتخاب برای چاپ'}</button><button onClick={() => onUpdateIdea(idea.id, { status: idea.status === 'hidden' ? 'approved' : 'hidden' })}>{idea.status === 'hidden' ? 'نمایش' : 'مخفی'}</button><button className="danger" onClick={() => onDeleteIdea(idea.id)}>حذف</button></div></article>)}</section><section><header><div><span className="section-tag">GROUP CHAT</span><h3>مدیریت گروه‌چت</h3></div><b>{fa(messages.length)} پیام</b></header>{messages.slice().reverse().map((message) => <article key={message.id}><span className="idea-rank">{message.avatar}</span><div><h4>{message.author}</h4><p>{message.text}</p></div><small>{message.time}</small><div className="manage-actions"><button className="danger" onClick={() => onDeleteMessage(message.id)}>حذف پیام</button></div></article>)}</section></div>
}

function TierOverview({ tier }) {
  return <div className="tier-overview"><span className={`tier-avatar large tone-${tier.color}`}>{tier.avatar}</span><div><small>سطح فعلی</small><h3>{tier.title} <em>{tier.fa}</em></h3><p>{fa(tier.score)} امتیاز فعالیت</p><div className="tier-progress"><i style={{ width: `${tier.progress}%` }}/></div><b>{tier.next ? `${fa(tier.next.min - tier.score)} امتیاز تا ${tier.next.title}` : 'به بالاترین سطح رسیدی!'}</b></div></div>
}

function Empty({ text, action }) { return <div className="portal-empty"><b>{text}</b><p>هر تغییر و نتیجه بررسی در همین بخش باقی می‌ماند.</p>{action && <button onClick={action}>ثبت مورد جدید</button>}</div> }

export default function AccountPortal({ session, tier, catalog, orders = [], reviews = [], offers = [], reports = [], favorites = [], coupons = {}, bids = [], ideas = [], communityMessages = [], supportMessages = [], onAdvanceOrder, onClose, onLogout, onAdd, onUpdate, onApprove, onReject, onDelete, onModerateReview, onDeleteReview, onOfferStatus, onReportStatus, onAddCoupon, onToggleCoupon, onCloseAuction, onReplySupport, onUpdateIdea, onDeleteIdea, onDeleteCommunityMessage }) {
  const admin = session.role === 'admin'
  const [tab, setTab] = useState(admin ? 'pending' : 'mine')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const setSection = (value) => { setTab(value); setEditing(null); setFormOpen(false) }
  const items = useMemo(() => {
    if (!['mine', 'pending', 'official', 'student'].includes(tab)) return []
    if (!admin) return catalog.filter((p) => p.source === 'student' && p.seller === session.name)
    if (tab === 'pending') return catalog.filter((p) => p.status === 'pending')
    if (tab === 'official') return catalog.filter((p) => p.source === 'official')
    return catalog.filter((p) => p.source === 'student' && p.status !== 'pending')
  }, [admin, catalog, session.name, tab])
  const visibleOrders = useMemo(() => admin ? orders : orders.filter((order) => order.buyer === session.name || order.seller === session.name), [admin, orders, session.name])
  const visibleReviews = admin ? reviews : reviews.filter((review) => review.author === session.name)
  const visibleOffers = admin ? offers : offers.filter((offer) => offer.buyer === session.name || catalog.find((p) => p.id === offer.productId)?.seller === session.name)
  const visibleReports = admin ? reports : reports.filter((report) => report.author === session.name)
  const favoriteProducts = catalog.filter((product) => favorites.includes(product.id))
  const readyBalance = orders.filter((order) => order.seller === session.name && order.status === 'completed').reduce((sum, order) => sum + order.amount, 0)
  const save = (data) => { if (editing) onUpdate(editing.id, data); else onAdd(data); setEditing(null); setFormOpen(false) }
  const titles = { pending: 'صف بررسی آگهی‌ها', official: 'محصولات رسمی Polyshop', student: 'بازار دانشجویی', mine: 'آگهی‌های من', orders: 'سفارش‌ها و تسویه‌ها', reviews: 'نظرها و امتیازها', offers: 'پیشنهادها و رزروها', reports: 'گزارش‌ها', favorites: 'علاقه‌مندی‌ها', coupons: 'کوپن‌ها و ژتون', auctions: 'مزایده‌ها', support: 'پشتیبانی مشتری‌ها', community: 'Poly Club و گروه‌چت' }
  const navButton = (value, label, count) => <button className={tab === value ? 'active' : ''} onClick={() => setSection(value)}><span>{label}</span>{count !== undefined && <b>{count}</b>}</button>

  return <main className="dashboard-page" aria-labelledby="portal-title"><aside className="dashboard-sidebar"><div className="dashboard-brand"><span className="dashboard-logo">P</span><span><b>Polyshop</b><small>{admin ? 'ADMIN PANEL' : 'MY ACCOUNT'}</small></span></div><div className="dashboard-profile"><span className={admin ? '' : `tier-avatar tone-${tier?.color}`}>{admin ? session.name.slice(0, 1) : tier?.avatar}</span><div><b>{session.name}</b><small>{admin ? 'مدیر فروشگاه' : `${tier?.title} · ${fa(tier?.score || 0)} امتیاز`}</small></div></div><nav aria-label={admin ? 'بخش‌های مدیریت' : 'بخش‌های حساب مشتری'}>{admin ? <>{navButton('pending', 'صف آگهی‌ها', catalog.filter((p) => p.status === 'pending').length)}{navButton('official', 'محصولات رسمی')}{navButton('student', 'بازار دانشجویی')}{navButton('orders', 'سفارش‌ها', orders.length)}{navButton('auctions', 'مزایده‌ها', catalog.filter((p) => p.tradeType === 'auction').length)}{navButton('reviews', 'نظرها', reviews.filter((r) => r.status === 'pending').length)}{navButton('offers', 'پیشنهادها', offers.filter((o) => o.status === 'pending').length)}{navButton('reports', 'گزارش‌ها', reports.filter((r) => r.status === 'pending').length)}{navButton('support', 'پشتیبانی', new Set(supportMessages.map((m) => m.customer)).size)}{navButton('community', 'Poly Club', ideas.length)}{navButton('coupons', 'کوپن‌ها', Object.keys(coupons).length)}</> : <>{navButton('mine', 'پروفایل و آگهی‌ها', items.length)}{navButton('orders', 'خرید و فروش‌های من', visibleOrders.length)}{navButton('auctions', 'مزایده‌های من', bids.filter((bid) => bid.bidder === session.name).length)}{navButton('reviews', 'نظرهای من', visibleReviews.length)}{navButton('offers', 'پیشنهادها', visibleOffers.length)}{navButton('reports', 'گزارش‌های من', visibleReports.length)}{navButton('favorites', 'علاقه‌مندی‌ها', favoriteProducts.length)}</>}<button className={formOpen && !editing ? 'active create' : 'create'} onClick={() => { setEditing(null); setFormOpen(true) }}><span>+ مورد جدید</span></button></nav><div className="dashboard-side-actions"><button onClick={onClose}>← بازگشت به فروشگاه</button><button className="logout" onClick={onLogout}>خروج از حساب</button></div></aside>
    <section className="dashboard-main"><header className="dashboard-topbar"><div><span className="section-tag">{admin ? 'POLYSHOP ADMIN' : 'MY POLYSHOP'}</span><h1 id="portal-title">{formOpen || editing ? editing ? 'ویرایش مورد' : 'افزودن مورد جدید' : titles[tab]}</h1><p>{admin ? 'هر جریان مشتری، اینجا مسیر رسیدگی مدیریتی دارد.' : 'آگهی، سفارش، نظر و پیشنهادهایت را یک‌جا پیگیری کن.'}</p></div><div><button className="back-store" onClick={onClose}>بازگشت به فروشگاه</button><button className="top-add" onClick={() => { setEditing(null); setFormOpen(true) }}>+ مورد جدید</button></div></header><div className="portal-content dashboard-content">
      {formOpen || editing ? <ProductForm session={session} initial={editing} onCancel={() => { setFormOpen(false); setEditing(null) }} onSave={save}/> : tab === 'orders' ? <><div className="balance-strip"><span><small>اعتبار قابل تسویه</small><b>{format(admin ? orders.filter((order) => order.status === 'completed').reduce((sum, order) => sum + order.amount, 0) : readyBalance)}</b></span><p>فروشنده آماده‌سازی را ثبت می‌کند؛ خریدار دریافت را تأیید می‌کند و سپس مبلغ قابل تسویه می‌شود.</p></div><div className="order-list">{visibleOrders.length ? visibleOrders.map((order) => <OrderRow key={order.id} order={order} session={session} onAdvance={onAdvanceOrder}/>) : <Empty text="هنوز سفارشی ثبت نشده."/>}</div></> : tab === 'auctions' ? <AuctionManager session={session} catalog={catalog} bids={bids} onCloseAuction={onCloseAuction}/> : tab === 'support' ? <SupportInbox messages={supportMessages} onReply={onReplySupport}/> : tab === 'community' ? <CommunityAdmin ideas={ideas} messages={communityMessages} onUpdateIdea={onUpdateIdea} onDeleteIdea={onDeleteIdea} onDeleteMessage={onDeleteCommunityMessage}/> : tab === 'reviews' ? <div className="moderation-list">{visibleReviews.length ? visibleReviews.map((review) => <ReviewRow key={review.id} review={review} product={catalog.find((p) => p.id === review.productId)} admin={admin} onModerate={onModerateReview} onDelete={onDeleteReview}/>) : <Empty text="هنوز نظری ثبت نشده است."/>}</div> : tab === 'offers' ? <div className="moderation-list">{visibleOffers.length ? visibleOffers.map((offer) => <OfferRow key={offer.id} offer={offer} product={catalog.find((p) => p.id === offer.productId)} session={session} onStatus={onOfferStatus}/>) : <Empty text="پیشنهاد یا رزروی وجود ندارد."/>}</div> : tab === 'reports' ? <div className="moderation-list">{visibleReports.length ? visibleReports.map((report) => <ReportRow key={report.id} report={report} product={catalog.find((p) => p.id === report.productId)} admin={admin} onStatus={onReportStatus} onDeleteProduct={onDelete}/>) : <Empty text="گزارشی وجود ندارد."/>}</div> : tab === 'coupons' ? <CouponManager coupons={coupons} onAdd={onAddCoupon} onToggle={onToggleCoupon}/> : tab === 'favorites' ? <div className="manage-list">{favoriteProducts.length ? favoriteProducts.map((product) => <ManageRow key={product.id} product={product} admin={false} readOnly/>) : <Empty text="هنوز چیزی را ذخیره نکردی."/>}</div> : <>{!admin && tab === 'mine' && <TierOverview tier={tier}/>}<div className="portal-summary"><span><b>{fa(items.length)}</b><small>{admin ? 'مورد در این بخش' : 'آگهی ثبت‌شده'}</small></span>{admin && <span><b>{fa(catalog.filter((p) => p.status === 'pending').length)}</b><small>نیازمند بررسی</small></span>}<span><b>{fa(catalog.filter((p) => p.status === 'approved').length)}</b><small>مورد منتشرشده</small></span></div><div className="manage-list">{items.length ? items.map((product) => <ManageRow key={product.id} product={product} admin={admin} onApprove={onApprove} onReject={onReject} onEdit={setEditing} onDelete={onDelete}/>) : <Empty text={admin ? 'این بخش فعلاً خالی است.' : 'هنوز آگهی‌ای ثبت نکردی.'} action={() => setFormOpen(true)}/>}</div></>}
    </div></section></main>
}
