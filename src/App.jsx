import { useEffect, useMemo, useState } from 'react'
import AccountPortal from './components/AccountPortal'
import CommunityHub from './components/CommunityHub'
import SupportWidget from './components/SupportWidget'
import { categories, demoCoupons, marketplaceCategories, products, studentProducts } from './data/products'
import { getTierProfile } from './data/tiers'

const icons = {
  bag: <><path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></>,
  wallet: <><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19v14H6.5A2.5 2.5 0 0 1 4 16.5v-9Z"/><path d="M4.5 8h14.8"/><path d="M15 12h5v4h-5a2 2 0 1 1 0-4Z"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
  plus: <><path d="M5 12h14"/><path d="M12 5v14"/></>, minus: <path d="M5 12h14"/>,
  close: <><path d="m6 6 12 12"/><path d="M18 6 6 18"/></>,
  trash: <><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="m7 7 1 13h8l1-13"/></>,
  ticket: <><path d="M4 8a2 2 0 0 0 0 4v4h16v-4a2 2 0 0 0 0-4V4H4v4Z"/><path d="M13 7h3M13 10h3M8 7v6"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  sparkle: <><path d="m12 3 1.2 4.2L17 9l-3.8 1.8L12 15l-1.2-4.2L7 9l3.8-1.8L12 3Z"/><path d="m5 15 .7 2.3L8 18l-2.3.7L5 21l-.7-2.3L2 18l2.3-.7L5 15Z"/></>,
  home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
  grid: <><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  store: <><path d="M4 10v10h16V10"/><path d="M3 10h18l-2-6H5l-2 6Z"/><path d="M8 20v-6h5v6"/></>,
}

function Icon({ name, size = 22 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name]}</svg> }
const format = (value) => `${new Intl.NumberFormat('fa-IR').format(value)} تومان`
const finalPrice = (product) => Math.round(product.price * (1 - (product.discount || 0) / 100))
const highestBid = (product, bids) => Math.max(Number(product.price) || 0, ...bids.filter((bid) => bid.productId === product.id).map((bid) => Number(bid.amount) || 0))
const auctionWinner = (product, bids) => [...bids].filter((bid) => bid.productId === product.id).sort((a, b) => b.amount - a.amount)[0] || null
const remainingLabel = (end, now = Date.now()) => { const diff = Number(end) - now; if (diff <= 0) return 'پایان‌یافته'; const hours = Math.floor(diff / 3600000), minutes = Math.floor((diff % 3600000) / 60000); return `${new Intl.NumberFormat('fa-IR').format(hours)} ساعت و ${new Intl.NumberFormat('fa-IR').format(minutes)} دقیقه` }
function safeRead(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback } }
const productImages = {
  'tee-amirkabir-1401': ['products/amirkabir-1401-product.jpg', 'products/amirkabir-1401-model-back.jpg', 'products/amirkabir-1401-model-front.jpg'],
  'tee-engineer-pear': ['products/engineer-pear-shirt-v2.jpg', 'products/engineer-pear-model-v2.jpg'],
  'tee-chaos': 'products/poly-tee.jpg',
  'tee-deadline': 'products/poly-tee.jpg',
  'hoodie-night': 'products/poly-hoodie.jpg',
  'pixel-ie': 'products/poly-accessories.jpg',
  'tote-campus': 'products/poly-accessories.jpg',
  'service-poster': 'products/poster-service.jpg',
  'service-cv': 'products/student-study.jpg',
  'student-or-book': 'products/market-book-phone.jpg',
  'student-gown': 'products/market-gown-phone.jpg',
  'student-calc': 'products/market-calculator-phone.jpg',
  'student-stat-notes': 'products/student-study.jpg',
  'auction-vintage-hoodie': 'products/market-auction-hoodie-phone.jpg',
}
const normalizeProduct = (product) => ({
  ...product,
  seller: product.source === 'official' ? 'Polyshop' : product.seller,
  images: productImages[product.id] ? (Array.isArray(productImages[product.id]) ? productImages[product.id] : [productImages[product.id]]) : product.images?.length ? product.images : [],
  productType: product.productType || (product.category === 'خدمات' ? 'service' : 'physical'),
  tradeType: product.tradeType || 'sale',
  deliveryMethods: product.deliveryMethods || (product.category === 'خدمات' ? [] : ['pickup', 'shipping']),
  pickupLocation: product.pickupLocation || 'دانشگاه صنعتی امیرکبیر',
  serviceMode: product.serviceMode || 'online',
  turnaround: product.turnaround || '۳ روز',
  availableSlots: product.availableSlots || 'شنبه تا چهارشنبه، ۱۶ تا ۲۰',
  courseCode: product.courseCode || '', professor: product.professor || '', isbn: product.isbn || '',
  auctionEndsAt: product.auctionEndsAt || null,
  minBidStep: Number(product.minBidStep) || 50000,
})

function ProductArt({ product, compact = false, gallery = true }) {
  const [photoIndex, setPhotoIndex] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  const [zoomPoint, setZoomPoint] = useState({ x: 50, y: 50 })
  const photos = product.images || []
  const currentPhoto = photos[Math.min(photoIndex, Math.max(0, photos.length - 1))]
  const marks = { tee: 'CTRL', 'tee-alt': '404', hoodie: '02:17', pin: 'IE', tote: 'P!', poster: 'Aa', cv: 'CV', ticket: 'ADMIT', book: 'BOOK', calc: '123' }
  const selectPhoto = (index) => { setPhotoIndex((index + photos.length) % photos.length); setZoomed(false) }
  const moveZoom = (event) => { const rect = event.currentTarget.getBoundingClientRect(); setZoomPoint({ x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100 }) }
  const photo = currentPhoto && <img className="product-photo" src={currentPhoto} alt={`تصویر ${product.title}`} style={{ transformOrigin: `${zoomPoint.x}% ${zoomPoint.y}%` }}/>
  return <div className={`product-art tone-${product.tone || 'turquoise'} ${compact ? 'compact' : ''} ${zoomed ? 'is-zoomed' : ''}`}><span className="art-grid" aria-hidden="true"/>{currentPhoto ? gallery && !compact ? <button type="button" className="product-photo-stage" onClick={() => setZoomed((value) => !value)} onMouseMove={moveZoom} onMouseLeave={() => setZoomed(false)} aria-label={zoomed ? `بستن بزرگ‌نمایی ${product.title}` : `بزرگ‌نمایی ${product.title}`}>{photo}</button> : <div className="product-photo-stage static">{photo}</div> : <div className={`merch-shape shape-${product.art || 'book'}`} aria-hidden="true"><b>{marks[product.art] || 'P!'}</b></div>}{gallery && photos.length > 1 && !compact && <><button type="button" className="gallery-arrow gallery-prev" onClick={() => selectPhoto(photoIndex - 1)} aria-label={`تصویر قبلی ${product.title}`}>‹</button><button type="button" className="gallery-arrow gallery-next" onClick={() => selectPhoto(photoIndex + 1)} aria-label={`تصویر بعدی ${product.title}`}>›</button><div className="product-photo-switcher" aria-label={`تصاویر ${product.title}`}>{photos.map((item, index) => <button type="button" key={item} className={index === photoIndex ? 'active' : ''} onClick={() => selectPhoto(index)} aria-label={`نمای ${new Intl.NumberFormat('fa-IR').format(index + 1)} ${product.title}`}><img src={item} alt=""/></button>)}</div></>}{gallery && currentPhoto && !compact && <span className="zoom-hint">{zoomed ? 'برای بستن کلیک کن' : 'برای زوم کلیک کن'}</span>}{!compact && <><span className="art-code">PL/{product.id.slice(0, 3).toUpperCase()}</span><span className="art-star"><Icon name="sparkle" size={18}/></span></>}</div>
}
function BrandMark() { return <span className="brand-mark" aria-hidden="true"><i>P</i><span/></span> }

function AuctionDetail({ product, bids, now, session, onClose, onBid, onAdd, onRequireLogin }) {
  const sorted = [...bids].filter((bid) => bid.productId === product.id).sort((a, b) => b.amount - a.amount)
  const current = highestBid(product, bids), ended = now >= Number(product.auctionEndsAt), winner = sorted[0] || null
  const [amount, setAmount] = useState(current + product.minBidStep)
  const [error, setError] = useState('')
  const submit = (event) => { event.preventDefault(); if (!session || session.role !== 'customer') return onRequireLogin(); if (session.name === product.seller) return setError('فروشنده نمی‌تواند روی مزایدهٔ خودش پیشنهاد بگذارد.'); if (ended) return setError('زمان مزایده تمام شده است.'); if (Number(amount) < current + product.minBidStep) return setError(`حداقل پیشنهاد بعدی ${format(current + product.minBidStep)} است.`); onBid(product, Number(amount)); setAmount(Number(amount) + product.minBidStep); setError('') }
  const isWinner = ended && winner?.bidder === session?.name
  return <div className="modal-wrap detail-wrap" role="dialog" aria-modal="true" aria-labelledby="auction-title"><button className="overlay" aria-label="بستن مزایده" onClick={onClose}/><article className="auction-modal"><button className="icon-button modal-close" onClick={onClose} aria-label="بستن"><Icon name="close"/></button><div className="auction-visual"><ProductArt product={product}/><span className={`auction-clock ${ended ? 'ended' : ''}`}>{ended ? 'مزایده تمام شد' : `⏱ ${remainingLabel(product.auctionEndsAt, now)}`}</span></div><div className="auction-copy"><span className="section-tag">LIVE AUCTION</span><h2 id="auction-title">{product.title}</h2><p>{product.blurb}</p><div className="auction-price"><small>بالاترین پیشنهاد</small><strong>{format(current)}</strong><span>شروع از {format(product.price)} · گام {format(product.minBidStep)}</span></div>{ended ? <div className="auction-result"><span>{winner ? '🏆' : '—'}</span><div><small>برندهٔ مزایده</small><b>{winner?.bidder || 'بدون پیشنهاد'}</b>{winner && <strong>{format(winner.amount)}</strong>}</div>{isWinner && <button onClick={() => { onAdd(product); onClose() }}>پرداخت و نهایی‌کردن خرید</button>}{winner && !isWinner && <p>پرداخت فقط برای حساب برنده فعال است.</p>}</div> : <form className="bid-form" onSubmit={submit}><label>پیشنهاد تو<input type="number" min={current + product.minBidStep} step={product.minBidStep} value={amount} onChange={(event) => setAmount(Number(event.target.value))}/></label><button type="submit">ثبت پیشنهاد</button><div className="form-message error">{error}</div></form>}<div className="bid-history"><header><b>پیشنهادهای ثبت‌شده</b><span>{new Intl.NumberFormat('fa-IR').format(sorted.length)} پیشنهاد</span></header>{sorted.length ? sorted.map((bid, index) => <div key={bid.id} className={index === 0 ? 'top' : ''}><span>{index === 0 ? '👑' : new Intl.NumberFormat('fa-IR').format(index + 1)}</span><b>{bid.bidder}</b><strong>{format(bid.amount)}</strong><small>{bid.time}</small></div>) : <p>هنوز پیشنهادی ثبت نشده؛ اولین نفر باش.</p>}</div></div></article></div>
}

function ProductCard({ product, addToCart, onView, reviews = [], bids = [], now, favorite = false, onFavorite, session, market = false }) {
  const price = finalPrice(product)
  const approved = reviews.filter((review) => review.productId === product.id && review.status === 'approved')
  const rating = approved.length ? approved.reduce((sum, item) => sum + item.rating, 0) / approved.length : 0
  const priceLabel = product.tradeType === 'auction' ? format(highestBid(product, bids)) : product.tradeType === 'free' ? 'رایگان' : product.tradeType === 'swap' ? 'معاوضه' : format(price)
  const actionLabel = product.tradeType === 'auction' ? (now >= product.auctionEndsAt ? 'نتیجه' : 'پیشنهاد') : product.reservedFor && product.reservedFor !== session?.name ? 'رزروشده' : product.stock ? product.productType === 'service' ? 'رزرو' : product.tradeType === 'swap' ? 'درخواست' : 'افزودن' : 'تمام شد'
  return <article className={`product-card ${market ? 'market-card' : ''} ${product.tradeType === 'auction' ? 'auction-card' : ''}`}>
    <button className="product-card-link" onClick={() => onView(product)} aria-label={`مشاهده جزئیات ${product.title}`}/>
    <div className="product-media">
      {product.reservedFor ? <span className="product-badge reserved">رزروشده</span> : product.badge && <span className="product-badge">{product.badge}</span>}
      {product.discount > 0 && <span className="discount-badge">{new Intl.NumberFormat('fa-IR').format(product.discount)}٪-</span>}
      <button className={`favorite-button ${favorite ? 'active' : ''}`} onClick={() => onFavorite(product.id)} aria-label={favorite ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}>{favorite ? '♥' : '♡'}</button>
      <ProductArt product={product} gallery={false}/>
    </div>
    <div className="product-body">
      <div className="product-meta"><span>{product.category}</span><span className={product.stock <= 1 ? 'low-stock' : ''}>{product.stock ? `${new Intl.NumberFormat('fa-IR').format(product.stock)} موجود` : 'ناموجود'}</span></div>
      <div className="card-signal-row"><span className="type-chip">{product.productType === 'service' ? 'خدمت' : ({ sale: 'فروش', rent: 'اجاره', swap: 'معاوضه', free: 'رایگان', auction: 'مزایده' }[product.tradeType] || 'فروش')}</span><span className="rating-mini">★ {rating ? rating.toLocaleString('fa-IR', { maximumFractionDigits: 1 }) : 'جدید'} <small>({new Intl.NumberFormat('fa-IR').format(approved.length)})</small></span></div>
      <h3>{product.title}</h3>
      {market && <div className="seller-line"><Icon name="user" size={15}/>{product.seller}</div>}
      <p>{product.blurb}</p>
      <div className="delivery-mini">{product.tradeType === 'auction' ? <span className="auction-mini">{remainingLabel(product.auctionEndsAt, now)}</span> : product.productType === 'service' ? <span>رزرو خدمت · {product.turnaround}</span> : <>{product.deliveryMethods.includes('pickup') && <span>تحویل دانشگاه</span>}{product.deliveryMethods.includes('shipping') && <span>ارسال</span>}</>}</div>
      <div className="product-foot"><div>{product.discount > 0 && <del>{format(product.price)}</del>}<strong>{priceLabel}</strong><small>{product.tradeType === 'auction' ? 'بالاترین پیشنهاد' : product.color}</small></div><div className="product-actions"><button disabled={!product.stock || (product.reservedFor && product.reservedFor !== session?.name)} onClick={() => product.tradeType === 'auction' ? onView(product) : addToCart(product)} aria-label={product.tradeType === 'auction' ? `ورود به مزایده ${product.title}` : `افزودن ${product.title} به سبد`}><Icon name={product.stock && !product.reservedFor ? 'plus' : 'close'} size={20}/><span>{actionLabel}</span></button></div></div>
    </div>
  </article>
}

function ProductDetail({ product, onClose, onAdd, reviews, bids, now, session, favorite, onFavorite, onRequireLogin, onReview, onOffer, onReport, onBid }) {
  const price = finalPrice(product)
  const [rating, setRating] = useState(5), [reviewText, setReviewText] = useState(''), [offerAmount, setOfferAmount] = useState(Math.round(price * .9)), [offerMessage, setOfferMessage] = useState(''), [panel, setPanel] = useState('reviews')
  if (product.tradeType === 'auction') return <AuctionDetail product={product} bids={bids} now={now} session={session} onClose={onClose} onBid={onBid} onAdd={onAdd} onRequireLogin={onRequireLogin}/>
  const approved = reviews.filter((review) => review.productId === product.id && review.status === 'approved')
  const average = approved.length ? approved.reduce((sum, item) => sum + item.rating, 0) / approved.length : 0
  const requireCustomer = (action) => { if (!session || session.role !== 'customer') { onRequireLogin(); return false } action(); return true }
  const submitReview = (event) => { event.preventDefault(); if (reviewText.trim().length < 4) return; requireCustomer(() => { onReview(product, rating, reviewText.trim()); setReviewText('') }) }
  const submitOffer = (event) => { event.preventDefault(); requireCustomer(() => { onOffer(product, 'offer', offerAmount, offerMessage.trim()); setOfferMessage('') }) }
  const priceLabel = product.tradeType === 'free' ? 'رایگان' : product.tradeType === 'swap' ? 'معاوضه' : format(price)
  return <div className="modal-wrap detail-wrap" role="dialog" aria-modal="true" aria-labelledby="detail-title"><button className="overlay" aria-label="بستن جزئیات" onClick={onClose}/><article className="detail-modal detail-with-community"><button className="icon-button modal-close" onClick={onClose} aria-label="بستن"><Icon name="close"/></button><div className="detail-visual"><ProductArt product={product}/><button className={`detail-favorite ${favorite ? 'active' : ''}`} onClick={() => requireCustomer(() => onFavorite(product.id))}>{favorite ? '♥ ذخیره شده' : '♡ ذخیره برای بعد'}</button></div><div className="detail-copy"><div className="detail-labels"><span>{product.source === 'official' ? 'فروشگاه رسمی' : 'بازار دانشجویی'}</span><span>{product.productType === 'service' ? 'خدمت' : ({ sale: 'فروش', rent: 'اجاره', swap: 'معاوضه', free: 'رایگان' }[product.tradeType] || 'فروش')}</span></div><h2 id="detail-title">{product.title}</h2><div className="detail-rating"><b>★ {average ? average.toLocaleString('fa-IR', { maximumFractionDigits: 1 }) : 'بدون امتیاز'}</b><span>{new Intl.NumberFormat('fa-IR').format(approved.length)} نظر منتشرشده</span></div><div className="detail-seller"><Icon name="user" size={18}/><span><small>فروشنده</small><b>{product.seller}</b></span></div><p>{product.blurb}</p><div className="detail-specs">{product.productType === 'service' ? <><span><small>شیوه ارائه</small><b>{product.serviceMode === 'file' ? 'تحویل فایل' : product.serviceMode === 'inperson' ? 'جلسه حضوری' : 'جلسه آنلاین'}</b></span><span><small>زمان انجام</small><b>{product.turnaround}</b></span><span><small>زمان‌های رزرو</small><b>{product.availableSlots}</b></span></> : <><span><small>وضعیت</small><b>{product.color || 'سالم'}</b></span><span><small>روش دریافت</small><b>{product.deliveryMethods.includes('pickup') ? 'حضوری' : ''}{product.deliveryMethods.length > 1 ? ' یا ارسال' : product.deliveryMethods.includes('shipping') ? 'ارسال' : ''}</b></span>{product.courseCode && <span><small>کد درس</small><b>{product.courseCode}</b></span>}{product.deliveryMethods.includes('pickup') && <span><small>محل حضوری</small><b>{product.pickupLocation}</b></span>}</>}</div><div className="detail-buy"><div>{product.discount > 0 && <del>{format(product.price)}</del>}<strong>{priceLabel}</strong></div><button disabled={!product.stock} onClick={() => { onAdd(product); onClose() }}>{product.productType === 'service' ? 'رزرو خدمت' : product.tradeType === 'swap' ? 'ثبت درخواست معاوضه' : 'افزودن به سبد'}</button></div>{product.source === 'student' && <div className="peer-actions"><button onClick={() => setPanel('offer')}>پیشنهاد قیمت</button><button onClick={() => requireCustomer(() => onOffer(product, 'reserve', 0, 'درخواست رزرو'))}>رزرو موقت</button><button onClick={() => setPanel('report')}>گزارش آگهی</button></div>}<div className="community-tabs"><button className={panel === 'reviews' ? 'active' : ''} onClick={() => setPanel('reviews')}>نظرها</button><button className={panel === 'write' ? 'active' : ''} onClick={() => setPanel('write')}>ثبت نظر</button></div>{panel === 'reviews' && <div className="review-list">{approved.length ? approved.map((review) => <article key={review.id}><div><b>{review.author}</b><span>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span></div><p>{review.text}</p>{review.verified && <small>خرید تأییدشده</small>}</article>) : <div className="review-empty">اولین نفری باش که تجربه‌اش را می‌نویسد.</div>}</div>}{panel === 'write' && <form className="review-form" onSubmit={submitReview}><label>امتیاز<div className="star-picker">{[1,2,3,4,5].map((value) => <button type="button" key={value} className={value <= rating ? 'active' : ''} onClick={() => setRating(value)} aria-label={`${value} ستاره`}>★</button>)}</div></label><label>نظر تو<textarea rows="3" value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="تجربه واقعی و مفیدت را بنویس..." required minLength="4"/></label><button type="submit">ارسال برای بررسی مدیریت</button></form>}{panel === 'offer' && <form className="review-form" onSubmit={submitOffer}><label>مبلغ پیشنهادی<input type="number" min="0" step="1000" value={offerAmount} onChange={(e) => setOfferAmount(Number(e.target.value))}/></label><label>پیام اختیاری<textarea rows="2" value={offerMessage} onChange={(e) => setOfferMessage(e.target.value)} placeholder="مثلاً امروز در دانشکده تحویل می‌گیرم"/></label><button type="submit">ارسال پیشنهاد به فروشنده</button></form>}{panel === 'report' && <div className="report-box"><p>اگر اطلاعات آگهی نادرست یا نامناسب است، مدیریت بررسی می‌کند.</p><button onClick={() => requireCustomer(() => onReport(product, 'اطلاعات یا محتوای آگهی نیاز به بررسی دارد.'))}>ثبت گزارش برای مدیریت</button></div>}{product.productType === 'service' && <div className="academic-notice"><b>خدمت مسئولانه</b><span>آموزش، مشاوره و بازخورد مجاز است؛ انجام تکلیف یا پایان‌نامه به‌جای دانشجو مجاز نیست.</span></div>}</div></article></div>
}

function LoginModal({ onClose, onLogin }) {
  const [role, setRole] = useState('customer')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const submit = (event) => { event.preventDefault(); if (role === 'customer' && !name.trim()) return setError('اسمت را وارد کن.'); if (role === 'admin' && password !== 'admin1405') return setError('رمز مدیریت درست نیست.'); onLogin({ role, name: role === 'admin' ? 'مدیر Polyshop' : name.trim() }) }
  return <div className="modal-wrap login-wrap" role="dialog" aria-modal="true" aria-labelledby="login-title"><button className="overlay" aria-label="بستن ورود" onClick={onClose}/><div className="login-modal"><button className="icon-button modal-close" onClick={onClose} aria-label="بستن"><Icon name="close"/></button><BrandMark/><span className="section-tag">WELCOME TO POLYSHOP</span><h2 id="login-title">چطور وارد می‌شی؟</h2><div className="role-switch"><button className={role === 'customer' ? 'active' : ''} onClick={() => { setRole('customer'); setError('') }}><Icon name="user"/><b>مشتری</b><small>خرید و ثبت آگهی</small></button><button className={role === 'admin' ? 'active' : ''} onClick={() => { setRole('admin'); setError('') }}><Icon name="store"/><b>مدیریت</b><small>کنترل فروشگاه</small></button></div><form onSubmit={submit}>{role === 'customer' ? <label>نام نمایشی<input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً محمد، صنایع ۱۴۰۲" autoFocus/></label> : <><label>رمز مدیریت<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="رمز آزمایشی" autoFocus/></label><div className="login-hint">برای تست مدیریت: <code>admin1405</code></div></>}<div className="form-message error" aria-live="polite">{error}</div><button className="confirm-button" type="submit">ورود به {role === 'admin' ? 'پنل مدیریت' : 'حساب مشتری'} <Icon name="arrow"/></button></form><p>این ورود در نسخه فعلی نمایشی و فقط روی همین مرورگر ذخیره می‌شود.</p></div></div>
}

const seedReviews = [
  { id: 'review-1', productId: 'tee-chaos', author: 'نیلوفر، صنایع', rating: 5, text: 'جنس پارچه نرم بود و چاپش بعد از چند بار شستن هنوز سالم مانده.', status: 'approved', verified: true },
  { id: 'review-2', productId: 'service-cv', author: 'پارسا، کامپیوتر', rating: 4, text: 'بازخوردها مشخص و کاربردی بود؛ بهتر است زمان‌های بیشتری برای رزرو اضافه شود.', status: 'approved', verified: true },
  { id: 'review-3', productId: 'student-or-book', author: 'مینا، صنایع', rating: 5, text: 'دقیقاً مطابق توضیحات بود و تحویل در دانشکده سریع انجام شد.', status: 'approved', verified: true },
]

const seedIdeas = [
  { id: 'idea-midnight', title: 'شیفت شبِ سایت', body: 'هودی سرمه‌ای با یک پنجره ترمینال کوچک و جملهٔ «هنوز ران می‌شه».', product: 'هودی', author: 'نیلوفر، صنایع', likes: ['پارسا، کامپیوتر', 'سارا، صنایع ۱۴۰۱'], comments: [{ id: 'ic-1', author: 'پارسا، کامپیوتر', text: 'پشت هودی ساعت ۰۳:۱۷ هم اضافه کنیم!', createdAt: Date.now() - 50000 }], status: 'approved', selected: true },
  { id: 'idea-queue', title: 'صف سلف، صف زندگی', body: 'تیشرت کرم با یک نمودار صف مینیمال و آدمک‌هایی که تا بی‌نهایت ادامه دارند.', product: 'تیشرت', author: 'کیانا، پلیمر', likes: ['نیلوفر، صنایع'], comments: [], status: 'approved', selected: false },
  { id: 'idea-aut-cat', title: 'گربهٔ بین دو کلاس', body: 'یک گربه خواب‌آلود روی جزوه تحقیق در عملیات برای توت‌بگ.', product: 'توت‌بگ', author: 'آرین، صنایع ۱۴۰۲', likes: [], comments: [], status: 'approved', selected: false },
]

const seedCommunityMessages = [
  { id: 'gm-1', author: 'مدیریت Polyshop', avatar: 'P!', text: 'برای دراپ بعدی چه رنگی بریم؟', time: '۱۸:۴۰' },
  { id: 'gm-2', author: 'نیلوفر، صنایع', avatar: '🐥', text: 'سرمه‌ای با چاپ نارنجی خیلی خوب می‌شه.', time: '۱۸:۴۲' },
]

const demoAuction = {
  id: 'auction-vintage-hoodie', title: 'هودی کمیاب «نسخه صفر»', subtitle: 'POLYSHOP ZERO DROP', category: 'لباس و وسایل', price: 600000,
  stock: 1, color: 'در حد نو · سایز L', art: 'hoodie', tone: 'mix', badge: 'مزایده',
  blurb: 'نمونهٔ اولیه هودی Polyshop که فقط یک عدد از آن وجود دارد. بالاترین پیشنهاد در پایان برنده می‌شود.',
  source: 'student', status: 'approved', seller: 'سام، صنایع ۱۴۰۰', discount: 0, productType: 'physical', tradeType: 'auction',
  deliveryMethods: ['pickup'], pickupLocation: 'دانشکده مهندسی صنایع', minBidStep: 50000,
}

function App() {
  const seed = [...products, ...studentProducts].map(normalizeProduct)
  const [catalog, setCatalog] = useState(() => { const stored = safeRead('boofeh-catalog-v2', seed).map(normalizeProduct); const missingSeed = seed.filter((item) => !stored.some((saved) => saved.id === item.id)); const auction = stored.some((item) => item.id === demoAuction.id) ? [] : [{ ...normalizeProduct(demoAuction), auctionEndsAt: Date.now() + 26 * 60 * 60 * 1000 }]; return [...missingSeed, ...auction, ...stored] })
  const [activeCategory, setActiveCategory] = useState('همه')
  const [marketCategory, setMarketCategory] = useState('همه')
  const [query, setQuery] = useState('')
  const [cart, setCart] = useState(() => safeRead('boofeh-cart-v2', {}))
  const [wallet, setWallet] = useState(() => safeRead('boofeh-wallet', 0))
  const [usedCoupons, setUsedCoupons] = useState(() => safeRead('boofeh-coupons', []))
  const [couponCatalog, setCouponCatalog] = useState(() => ({ ...demoCoupons, ...safeRead('boofeh-coupon-catalog-v1', {}) }))
  const [session, setSession] = useState(() => { const saved = safeRead('boofeh-session', null); return saved?.name === 'مدیر بوفه' ? { ...saved, name: 'مدیر Polyshop' } : saved })
  const [orders, setOrders] = useState(() => safeRead('boofeh-orders-v1', []))
  const [reviews, setReviews] = useState(() => safeRead('boofeh-reviews-v1', seedReviews))
  const [offers, setOffers] = useState(() => safeRead('boofeh-offers-v1', []))
  const [reports, setReports] = useState(() => safeRead('boofeh-reports-v1', []))
  const [favorites, setFavorites] = useState(() => safeRead('boofeh-favorites-v1', []))
  const [bids, setBids] = useState(() => safeRead('boofeh-bids-v1', []))
  const [ideas, setIdeas] = useState(() => safeRead('boofeh-ideas-v1', seedIdeas))
  const [communityMessages, setCommunityMessages] = useState(() => safeRead('boofeh-community-chat-v1', seedCommunityMessages).map((message) => message.author === 'مدیریت بوفه' ? { ...message, author: 'مدیریت Polyshop', avatar: 'P!' } : message))
  const [supportMessages, setSupportMessages] = useState(() => safeRead('boofeh-support-v1', []))
  const [now, setNow] = useState(Date.now())
  const [coupon, setCoupon] = useState('')
  const [couponState, setCouponState] = useState({ type: '', message: '' })
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [successOrder, setSuccessOrder] = useState(null)
  const [loginOpen, setLoginOpen] = useState(false)
  const [portalOpen, setPortalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [checkoutChoices, setCheckoutChoices] = useState({})
  const [pickupSlots, setPickupSlots] = useState({})
  const [shippingAddress, setShippingAddress] = useState('')
  const [checkoutError, setCheckoutError] = useState('')
  const [toast, setToast] = useState('')
  const [page, setPage] = useState(() => window.location.hash === '#club' ? 'community' : 'shop')

  useEffect(() => { try { localStorage.setItem('boofeh-catalog-v2', JSON.stringify(catalog)) } catch { setToast('حجم تصاویر زیاد است؛ چند تصویر کوچک‌تر انتخاب کن') } }, [catalog])
  useEffect(() => localStorage.setItem('boofeh-cart-v2', JSON.stringify(cart)), [cart])
  useEffect(() => localStorage.setItem('boofeh-wallet', JSON.stringify(wallet)), [wallet])
  useEffect(() => localStorage.setItem('boofeh-coupons', JSON.stringify(usedCoupons)), [usedCoupons])
  useEffect(() => localStorage.setItem('boofeh-coupon-catalog-v1', JSON.stringify(couponCatalog)), [couponCatalog])
  useEffect(() => localStorage.setItem('boofeh-session', JSON.stringify(session)), [session])
  useEffect(() => localStorage.setItem('boofeh-orders-v1', JSON.stringify(orders)), [orders])
  useEffect(() => localStorage.setItem('boofeh-reviews-v1', JSON.stringify(reviews)), [reviews])
  useEffect(() => localStorage.setItem('boofeh-offers-v1', JSON.stringify(offers)), [offers])
  useEffect(() => localStorage.setItem('boofeh-reports-v1', JSON.stringify(reports)), [reports])
  useEffect(() => localStorage.setItem('boofeh-favorites-v1', JSON.stringify(favorites)), [favorites])
  useEffect(() => localStorage.setItem('boofeh-bids-v1', JSON.stringify(bids)), [bids])
  useEffect(() => localStorage.setItem('boofeh-ideas-v1', JSON.stringify(ideas)), [ideas])
  useEffect(() => localStorage.setItem('boofeh-community-chat-v1', JSON.stringify(communityMessages)), [communityMessages])
  useEffect(() => localStorage.setItem('boofeh-support-v1', JSON.stringify(supportMessages)), [supportMessages])
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer) }, [])
  useEffect(() => { setCatalog((prev) => prev.map((product) => product.reservationExpiresAt && product.reservationExpiresAt < Date.now() ? { ...product, reservedFor: '', reservationExpiresAt: null } : product)) }, [])
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 2600); return () => clearTimeout(timer) }, [toast])
  useEffect(() => { const modalOpen = cartOpen || checkoutOpen || successOrder || loginOpen || selectedProduct; document.body.style.overflow = modalOpen ? 'hidden' : ''; const close = (e) => { if (e.key === 'Escape') { setCartOpen(false); setCheckoutOpen(false); setSuccessOrder(null); setLoginOpen(false); setSelectedProduct(null) } }; window.addEventListener('keydown', close); return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', close) } }, [cartOpen, checkoutOpen, successOrder, loginOpen, selectedProduct])

  const official = useMemo(() => catalog.filter((p) => p.source === 'official' && p.status === 'approved' && (activeCategory === 'همه' || p.category === activeCategory) && `${p.title} ${p.category} ${p.blurb}`.toLowerCase().includes(query.trim().toLowerCase())), [catalog, activeCategory, query])
  const marketplace = useMemo(() => catalog.filter((p) => p.source === 'student' && p.status === 'approved' && (marketCategory === 'همه' || p.category === marketCategory)), [catalog, marketCategory])
  const cartItems = useMemo(() => catalog.filter((p) => cart[p.id]).map((p) => ({ ...p, qty: cart[p.id] })), [catalog, cart])
  const tierProfile = useMemo(() => getTierProfile(session?.name, { orders, reviews, catalog, ideas, communityMessages }), [session?.name, orders, reviews, catalog, ideas, communityMessages])
  const latestIdea = useMemo(() => [...ideas].filter((idea) => idea.status !== 'hidden').sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0], [ideas])
  const cartCount = cartItems.reduce((sum, item) => sum + item.qty, 0)
  const subtotal = cartItems.reduce((sum, item) => sum + finalPrice(item) * item.qty, 0)
  const walletSpend = Math.min(wallet, subtotal), gatewayAmount = Math.max(0, subtotal - walletSpend)

  const addToCart = (product) => { const current = cart[product.id] || 0; if (product.tradeType === 'auction') { const winner = auctionWinner(product, bids); if (now < Number(product.auctionEndsAt)) return setToast('این محصول تا پایان مزایده قابل خرید نیست'); if (!session || winner?.bidder !== session.name) return setToast('پرداخت این محصول فقط برای برندهٔ مزایده فعال است') } if (product.reservedFor && product.reservedFor !== session?.name) return setToast('این مورد فعلاً برای دانشجوی دیگری رزرو شده'); if (product.stock <= current) return setToast('بیشتر از موجودی نمی‌شود اضافه کرد'); setCart((prev) => ({ ...prev, [product.id]: current + 1 })); setToast(`${product.title} رفت توی سبد`) }
  const changeQty = (id, delta) => setCart((prev) => { const next = (prev[id] || 0) + delta, product = catalog.find((p) => p.id === id); if (next <= 0) { const copy = { ...prev }; delete copy[id]; return copy } if (next > (product?.stock || 0)) { setToast('این تمام موجودی فعلی است'); return prev } return { ...prev, [id]: next } })
  const applyCoupon = (event) => { event.preventDefault(); const code = coupon.trim().toUpperCase(); if (!code) return setCouponState({ type: 'error', message: 'اول کد را وارد کن.' }); if (!couponCatalog[code] || couponCatalog[code].active === false) return setCouponState({ type: 'error', message: 'این کد فعال نیست یا پیدا نشد.' }); if (usedCoupons.includes(code)) return setCouponState({ type: 'error', message: 'این کوپن قبلاً مصرف شده.' }); const reward = couponCatalog[code]; setWallet((v) => v + reward.amount); setUsedCoupons((v) => [...v, code]); setCouponCatalog((prev) => ({ ...prev, [code]: { ...prev[code], usedCount: (prev[code].usedCount || 0) + 1, active: prev[code].oneTime ? false : prev[code].active } })); setCouponState({ type: 'success', message: `${format(reward.amount)} ژتون اضافه شد.` }); setCoupon('') }
  const openCheckout = () => { const choices = {}, slots = {}; cartItems.forEach((item) => { choices[item.id] = item.productType === 'service' ? 'service' : item.deliveryMethods.includes('pickup') ? 'pickup' : 'shipping'; slots[item.id] = '' }); setCheckoutChoices(choices); setPickupSlots(slots); setCheckoutError(''); setCartOpen(false); setCheckoutOpen(true) }
  const completeOrder = () => {
    const needsAddress = cartItems.some((item) => checkoutChoices[item.id] === 'shipping')
    if (needsAddress && shippingAddress.trim().length < 10) return setCheckoutError('برای محصولات ارسالی، آدرس کامل را وارد کن.')
    const needsSlot = cartItems.some((item) => ['pickup', 'service'].includes(checkoutChoices[item.id]) && !pickupSlots[item.id])
    if (needsSlot) return setCheckoutError('برای تحویل حضوری یا خدمت، زمان مناسب را انتخاب کن.')
    const masterId = `BF-${new Intl.NumberFormat('fa-IR', { useGrouping: false }).format(Math.floor(1000 + Math.random() * 8999))}`
    const created = cartItems.map((item, index) => ({ id: `${masterId}-${index + 1}`, masterId, productId: item.id, productTitle: item.title, productType: item.productType, seller: item.seller, buyer: session?.name || 'خریدار مهمان', qty: item.qty, amount: finalPrice(item) * item.qty, fulfillment: checkoutChoices[item.id], pickupLocation: item.pickupLocation, pickupSlot: pickupSlots[item.id] || '', handoffCode: String(Math.floor(1000 + Math.random() * 9000)), address: checkoutChoices[item.id] === 'shipping' ? shippingAddress.trim() : '', status: 'paid', createdAt: new Date().toISOString() }))
    setOrders((prev) => [...created, ...prev]); setWallet((v) => Math.max(0, v - walletSpend)); setCatalog((prev) => prev.map((p) => cart[p.id] ? { ...p, stock: Math.max(0, p.stock - cart[p.id]) } : p)); setCart({}); setCheckoutOpen(false); setShippingAddress(''); setSuccessOrder({ id: masterId, count: created.length })
  }
  const openAccount = () => session ? setPortalOpen(true) : setLoginOpen(true)
  const openPage = (next) => { setPage(next); window.history.replaceState(null, '', next === 'community' ? '#club' : '#top'); window.scrollTo({ top: 0, behavior: 'auto' }) }
  const addProduct = (data) => { const id = `${data.source}-${Date.now()}`; setCatalog((prev) => [{ ...data, id, tone: data.tone || (data.source === 'official' ? 'turquoise' : 'cream'), art: data.art || 'book' }, ...prev]); setToast(data.status === 'pending' ? 'آگهی برای بررسی ارسال شد' : 'محصول منتشر شد') }
  const updateProduct = (id, data) => { setCatalog((prev) => prev.map((p) => p.id === id ? { ...p, ...data, id } : p)); setToast('تغییرات ذخیره شد') }
  const approveProduct = (id) => { setCatalog((prev) => prev.map((p) => p.id === id ? { ...p, status: 'approved', badge: p.badge || 'تازه منتشرشده' } : p)); setToast('آگهی تأیید و منتشر شد') }
  const rejectProduct = (id) => { setCatalog((prev) => prev.map((p) => p.id === id ? { ...p, status: 'rejected' } : p)); setToast('آگهی رد شد و نتیجه برای فروشنده ماند') }
  const deleteProduct = (id) => { setCatalog((prev) => prev.filter((p) => p.id !== id)); setCart((prev) => { const copy = { ...prev }; delete copy[id]; return copy }); setToast('محصول حذف شد') }
  const advanceOrder = (id, handoff = '') => { const current = orders.find((order) => order.id === id); if (current?.status === 'processing' && current.fulfillment === 'pickup' && handoff !== current.handoffCode) return setToast('کد تحویل درست نیست'); const flow = { paid: 'processing', processing: 'delivered', delivered: 'completed' }; setOrders((prev) => prev.map((order) => order.id === id ? { ...order, status: flow[order.status] || order.status } : order)); setToast('وضعیت سفارش به‌روز شد') }
  const toggleFavorite = (id) => { if (!session || session.role !== 'customer') { setLoginOpen(true); return } setFavorites((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]); setToast(favorites.includes(id) ? 'از علاقه‌مندی‌ها حذف شد' : 'برای بعد ذخیره شد') }
  const addReview = (product, rating, text) => { const existing = reviews.find((review) => review.productId === product.id && review.author === session?.name); const review = { id: existing?.id || `review-${Date.now()}`, productId: product.id, author: session.name, rating, text, status: 'pending', verified: orders.some((order) => order.productId === product.id && order.buyer === session.name && order.status === 'completed'), createdAt: new Date().toISOString() }; setReviews((prev) => existing ? prev.map((item) => item.id === existing.id ? review : item) : [review, ...prev]); setToast('نظر برای بررسی مدیریت ارسال شد') }
  const moderateReview = (id, status) => { setReviews((prev) => prev.map((review) => review.id === id ? { ...review, status } : review)); setToast(status === 'approved' ? 'نظر منتشر شد' : 'نظر رد شد') }
  const deleteReview = (id) => { setReviews((prev) => prev.filter((review) => review.id !== id)); setToast('نظر حذف شد') }
  const addOffer = (product, kind, amount, message) => { setOffers((prev) => [{ id: `offer-${Date.now()}`, productId: product.id, buyer: session.name, kind, amount: Number(amount) || 0, message, status: 'pending', createdAt: new Date().toISOString() }, ...prev]); setToast(kind === 'reserve' ? 'درخواست رزرو برای فروشنده ارسال شد' : 'پیشنهاد قیمت ارسال شد') }
  const setOfferStatus = (id, status) => { const offer = offers.find((item) => item.id === id); setOffers((prev) => prev.map((item) => item.id === id ? { ...item, status } : item)); if (offer?.kind === 'reserve') setCatalog((prev) => prev.map((product) => product.id === offer.productId ? { ...product, reservedFor: status === 'accepted' ? offer.buyer : '', reservationExpiresAt: status === 'accepted' ? Date.now() + 2 * 60 * 60 * 1000 : null } : product)); setToast(status === 'accepted' ? 'رزرو فعال شد' : status === 'cancelled' ? 'رزرو لغو شد' : 'وضعیت پیشنهاد به‌روز شد') }
  const addReport = (product, reason) => { setReports((prev) => [{ id: `report-${Date.now()}`, productId: product.id, author: session.name, reason, status: 'pending', createdAt: new Date().toISOString() }, ...prev]); setToast('گزارش به مدیریت رسید') }
  const setReportStatus = (id, status) => { setReports((prev) => prev.map((report) => report.id === id ? { ...report, status } : report)); setToast('گزارش رسیدگی شد') }
  const addCoupon = ({ code, amount, label, oneTime = true }) => { const normalized = code.trim().toUpperCase(); if (!normalized || Number(amount) <= 0) return; setCouponCatalog((prev) => ({ ...prev, [normalized]: { amount: Number(amount), label: label.trim() || 'کوپن Polyshop', active: true, oneTime, usedCount: 0 } })); setToast('کد ژتون ساخته و فعال شد') }
  const toggleCoupon = (code) => { setCouponCatalog((prev) => ({ ...prev, [code]: { ...prev[code], active: prev[code].active === false } })); setToast('وضعیت کوپن تغییر کرد') }
  const addBid = (product, amount) => { const current = highestBid(product, bids); if (Date.now() >= Number(product.auctionEndsAt) || amount < current + product.minBidStep) return setToast('پیشنهاد معتبر نیست یا مزایده تمام شده'); setBids((prev) => [{ id: `bid-${Date.now()}`, productId: product.id, bidder: session.name, amount, createdAt: new Date().toISOString(), time: new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(new Date()) }, ...prev]); setToast('پیشنهادت ثبت شد و برای همه قابل مشاهده است') }
  const closeAuction = (id) => { setCatalog((prev) => prev.map((product) => product.id === id ? { ...product, auctionEndsAt: Date.now() } : product)); setNow(Date.now()); setToast('مزایده بسته و برنده مشخص شد') }
  const addIdea = (data) => { setIdeas((prev) => [{ id: `idea-${Date.now()}`, ...data, author: session.name, likes: [], comments: [], status: 'approved', selected: false, createdAt: new Date().toISOString() }, ...prev]); setToast('ایده‌ات وارد رأی‌گیری شد') }
  const likeIdea = (id) => { setIdeas((prev) => prev.map((idea) => idea.id === id ? { ...idea, likes: idea.likes?.includes(session.name) ? idea.likes.filter((name) => name !== session.name) : [...(idea.likes || []), session.name] } : idea)) }
  const commentIdea = (id, text) => { setIdeas((prev) => prev.map((idea) => idea.id === id ? { ...idea, comments: [...(idea.comments || []), { id: `comment-${Date.now()}`, author: session.name, text, likes: [], createdAt: new Date().toISOString() }] } : idea)); setToast('نظرت ثبت شد') }
  const likeIdeaComment = (ideaId, commentId) => { setIdeas((prev) => prev.map((idea) => idea.id === ideaId ? { ...idea, comments: (idea.comments || []).map((comment) => comment.id === commentId ? { ...comment, likes: comment.likes?.includes(session.name) ? comment.likes.filter((name) => name !== session.name) : [...(comment.likes || []), session.name] } : comment) } : idea)) }
  const updateIdea = (id, changes) => { setIdeas((prev) => prev.map((idea) => idea.id === id ? { ...idea, ...changes } : idea)); setToast(changes.selected ? 'طرح برای چاپ انتخاب شد' : 'وضعیت طرح تغییر کرد') }
  const deleteIdea = (id) => { setIdeas((prev) => prev.filter((idea) => idea.id !== id)); setToast('طرح حذف شد') }
  const sendCommunityMessage = (text) => { setCommunityMessages((prev) => [...prev, { id: `group-${Date.now()}`, author: session.name, avatar: tierProfile.avatar, text, time: new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(new Date()) }]) }
  const deleteCommunityMessage = (id) => { setCommunityMessages((prev) => prev.filter((message) => message.id !== id)); setToast('پیام گروه حذف شد') }
  const sendSupport = (text) => { setSupportMessages((prev) => [...prev, { id: `support-${Date.now()}`, customer: session.name, from: 'customer', text, time: new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(new Date()), seen: false }]); setToast('پیامت به مدیریت رسید') }
  const replySupport = (customer, text) => { setSupportMessages((prev) => [...prev, { id: `support-${Date.now()}`, customer, from: 'admin', text, time: new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(new Date()), seen: false }]); setToast('پاسخ برای مشتری ارسال شد') }

  if (portalOpen && session) return <AccountPortal session={session} tier={tierProfile} catalog={catalog} orders={orders} reviews={reviews} offers={offers} reports={reports} favorites={favorites} coupons={couponCatalog} bids={bids} ideas={ideas} communityMessages={communityMessages} supportMessages={supportMessages} onAdvanceOrder={advanceOrder} onClose={() => setPortalOpen(false)} onLogout={() => { setSession(null); setPortalOpen(false); setToast('از حساب خارج شدی') }} onAdd={addProduct} onUpdate={updateProduct} onApprove={approveProduct} onReject={rejectProduct} onDelete={deleteProduct} onModerateReview={moderateReview} onDeleteReview={deleteReview} onOfferStatus={setOfferStatus} onReportStatus={setReportStatus} onAddCoupon={addCoupon} onToggleCoupon={toggleCoupon} onCloseAuction={closeAuction} onReplySupport={replySupport} onUpdateIdea={updateIdea} onDeleteIdea={deleteIdea} onDeleteCommunityMessage={deleteCommunityMessage}/>

  return <div className="app-shell" id="top">
    <div className="announcement"><span>فروشگاه رسمی + بازار دانشجویی</span><b>•</b><span>پرداخت فعلاً شبیه‌سازی می‌شود</span><b>•</b><span>ثبت آگهی برای همه دانشجوها</span></div>
    <header className="site-header"><button className="brand" onClick={() => openPage('shop')} aria-label="Polyshop، صفحه اصلی"><BrandMark/><span><b>Polyshop</b><small>CAMPUS MARKET</small></span></button><nav className="primary-tabs" aria-label="بخش‌های اصلی سایت"><button className={page === 'shop' ? 'active' : ''} onClick={() => openPage('shop')}><Icon name="store" size={18}/> فروشگاه</button><button className={page === 'community' ? 'active' : ''} onClick={() => openPage('community')}><Icon name="sparkle" size={18}/> Poly Club</button></nav><div className="header-actions"><button className="account-button" onClick={openAccount}>{session?.role === 'customer' ? <span className={`tier-avatar tone-${tierProfile.color}`}>{tierProfile.avatar}</span> : <Icon name="user"/>}<span><small>{session ? session.role === 'admin' ? 'مدیریت' : tierProfile.title : 'ورود'}</small><b>{session?.name || 'مشتری / مدیر'}</b></span></button><button className="cart-button" onClick={() => setCartOpen(true)} aria-label={`سبد خرید با ${cartCount} کالا`}><Icon name="bag"/><span>سبد</span>{cartCount > 0 && <b>{new Intl.NumberFormat('fa-IR').format(cartCount)}</b>}</button></div></header>
    <main className={page === 'community' ? 'community-page' : ''}>
      {page === 'shop' ? <>
      <section className="hero"><div className="hero-copy"><div className="eyebrow"><span>بازارچه کوچک دانشگاه</span><i>حالا دو بخشه</i></div><h1>هم از Polyshop بخر،<br/>هم از <em>هم‌دانشگاهیت.</em></h1><p>مرچ و خدمات اختصاصی Polyshop یک طرف؛ کتاب‌ها، وسایل و چیزهایی که دانشجوهای دیگر برای فروش گذاشته‌اند یک طرف دیگر.</p><div className="hero-actions"><a className="primary-button" href="#official">فروشگاه رسمی <Icon name="arrow"/></a><a className="ghost-link" href="#market"><Icon name="store" size={19}/> بازار دانشجویی</a></div><div className="trust-row"><span><Icon name="check" size={17}/> آگهی‌های تأییدشده</span><span><Icon name="check" size={17}/> موجودی شفاف</span><span><Icon name="check" size={17}/> خرید با ژتون</span></div></div><div className="hero-stage" aria-label="کلاژ نمایشی محصولات Polyshop"><div className="blob blob-one"/><div className="blob blob-two"/><div className="hero-product"><span>POLY<br/>SUPPLY<br/>CLUB</span><b>OFFICIAL</b></div><div className="hero-ticket"><small>STUDENT MARKET</small><b>خرید و فروش</b><span>بین خود بچه‌ها</span></div><div className="hero-pin">P!</div><span className="scribble">فروشگاه و کلاب<br/>یک Polyshop</span></div></section>
      <section className="ticker" aria-hidden="true"><div>فروشگاه رسمی <b>✦</b> بازار دست‌دوم <b>✦</b> ثبت آگهی دانشجویی <b>✦</b> ژتون جایزه <b>✦</b> فروشگاه رسمی <b>✦</b> بازار دست‌دوم</div></section>
      <section className="shop-section official-section" id="official"><div className="section-head"><div><span className="section-tag">POLYSHOP OFFICIAL / 01</span><h2>فروشگاه رسمی Polyshop</h2></div><p>محصول‌هایی که خود Polyshop طراحی، تهیه و با موجودی مشخص عرضه می‌کند.</p></div><div className="section-identity official-identity"><Icon name="check"/><span><b>فروشنده: خود Polyshop</b><small>تولید و تأمین مستقیم</small></span></div><div className="shop-toolbar"><div className="categories">{categories.map((c) => <button key={c} className={activeCategory === c ? 'active' : ''} onClick={() => setActiveCategory(c)}>{c}</button>)}</div><label className="search-box"><span className="sr-only">جست‌وجوی محصول رسمی</span><Icon name="search" size={20}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="توی فروشگاه بگرد..."/></label></div><div className="product-grid">{official.map((p) => <ProductCard key={p.id} product={p} reviews={reviews} bids={bids} now={now} session={session} favorite={favorites.includes(p.id)} onFavorite={toggleFavorite} addToCart={addToCart} onView={setSelectedProduct}/>)}</div></section>
      <section className="marketplace-section" id="market"><div className="market-head"><div><span className="section-tag">STUDENT TO STUDENT</span><h2>بازار دانشجویی</h2><p>فروش، اجاره، معاوضه و مزایدهٔ کتاب‌ها و وسایل دانشجویی؛ هر آگهی قبل از انتشار بررسی می‌شود.</p></div><button onClick={openAccount}><Icon name="plus"/> محصولت رو بفروش</button></div><div className="section-identity market-identity"><Icon name="user"/><span><b>فروشنده‌ها: دانشجوهای دانشگاه</b><small>همه آگهی‌ها قبل از انتشار بررسی می‌شوند</small></span></div><div className="categories market-categories">{marketplaceCategories.map((c) => <button key={c} className={marketCategory === c ? 'active' : ''} onClick={() => setMarketCategory(c)}>{c}</button>)}</div><div className="product-grid market-grid">{marketplace.map((p) => <ProductCard key={p.id} product={p} reviews={reviews} bids={bids} now={now} session={session} favorite={favorites.includes(p.id)} onFavorite={toggleFavorite} addToCart={addToCart} onView={setSelectedProduct} market/>)}</div></section>
      <section className="sell-banner"><div><span className="section-tag">GIVE IT A SECOND LIFE</span><h2>دیگه لازمَش نداری؟<br/>یکی دیگه شاید لازم داشته باشه.</h2><p>با حساب مشتری وارد شو، محصول را ثبت کن و بعد از تأیید مدیریت در بازار دانشجویی بفروشش.</p></div><button onClick={openAccount}>ثبت آگهی رایگان <Icon name="arrow"/></button></section>
      {latestIdea && <section className="latest-idea-teaser"><div className="latest-idea-art">{latestIdea.image ? <img src={latestIdea.image} alt=""/> : <><span>{latestIdea.product}</span><b>{latestIdea.title.slice(0, 2)}</b></>}</div><div className="latest-idea-copy"><span className="section-tag">NEW IN POLY CLUB</span><small>جدیدترین پست جامعه</small><h2>{latestIdea.title}</h2><p>{latestIdea.body}</p><div><span>توسط {latestIdea.author}</span><span>♥ {new Intl.NumberFormat('fa-IR').format(latestIdea.likes?.length || 0)}</span><span>{new Intl.NumberFormat('fa-IR').format(latestIdea.comments?.length || 0)} نظر</span></div><button onClick={() => openPage('community')}>رفتن به Poly Club <Icon name="arrow"/></button></div></section>}
      <section className="coupon-section" id="coupon"><div className="coupon-copy"><span className="section-tag">COUPON → WALLET</span><h2>کدت رو بزن،<br/>ژتون بگیر.</h2><p>کوپن مسابقه یا رویداد را وارد کن تا اعتبارش به کیف پول Polyshop اضافه شود.</p><div className="demo-hint"><span>برای تست</span><code>POLY50</code><small>۵۰ هزار تومان ژتون</small></div></div><div className="wallet-card"><div className="wallet-top"><span><Icon name="wallet"/> کیف پول Polyshop</span><small>موجودی فعلی</small><strong>{format(wallet)}</strong></div><form onSubmit={applyCoupon}><label htmlFor="coupon-code">کد کوپن</label><div className="coupon-input"><input id="coupon-code" value={coupon} onChange={(e) => { setCoupon(e.target.value); setCouponState({ type: '', message: '' }) }} placeholder="مثلاً POLY50"/><button type="submit">ثبت کد</button></div><div className={`form-message ${couponState.type}`} aria-live="polite">{couponState.message}</div></form></div></section>
      </> : <CommunityHub standalone session={session} tier={tierProfile} ideas={ideas} messages={communityMessages} onBack={() => openPage('shop')} onRequireLogin={() => setLoginOpen(true)} onAddIdea={addIdea} onLikeIdea={likeIdea} onCommentIdea={commentIdea} onLikeComment={likeIdeaComment} onSendMessage={sendCommunityMessage}/>} 
    </main>
    <footer><div className="footer-brand"><BrandMark/><span><b>Polyshop</b><small>خرید کن. بفروش. ایده بده.</small></span></div><p>بازار مستقل دانشجویی برای خرید، فروش و ساختن چیزهایی که دوست داریم.</p><div className="footer-links"><button onClick={() => openPage('shop')}>فروشگاه</button><button onClick={() => openPage('community')}>Poly Club</button><a href="#coupon">ژتون</a></div><small>© ۲۰۲۶ POLYSHOP — MADE BETWEEN CLASSES.</small></footer>
    <nav className="mobile-dock" aria-label="ناوبری موبایل"><button className={page === 'shop' ? 'active' : ''} onClick={() => openPage('shop')}><Icon name="store"/><span>فروشگاه</span></button><button className={page === 'community' ? 'active' : ''} onClick={() => openPage('community')}><Icon name="sparkle"/><span>کلاب</span></button><button onClick={openAccount}><Icon name="user"/><span>حساب</span></button><button onClick={() => setCartOpen(true)}><Icon name="bag"/><span>سبد</span>{cartCount > 0 && <b>{new Intl.NumberFormat('fa-IR').format(cartCount)}</b>}</button></nav>
    {cartOpen && <button className="overlay" aria-label="بستن سبد" onClick={() => setCartOpen(false)}/>}<aside className={`cart-drawer ${cartOpen ? 'open' : ''}`} aria-hidden={!cartOpen}><div className="drawer-head"><div><span className="section-tag">YOUR PICKS</span><h2>سبد Polyshop <b>{new Intl.NumberFormat('fa-IR').format(cartCount)}</b></h2></div><button className="icon-button" onClick={() => setCartOpen(false)} aria-label="بستن سبد"><Icon name="close"/></button></div><div className="cart-list">{!cartItems.length ? <div className="empty-cart"><span><Icon name="bag" size={34}/></span><h3>هنوز چیزی برنداشتی</h3><p>هر دو بخش فروشگاه را بگرد.</p></div> : cartItems.map((item) => <div className="cart-line" key={item.id}><ProductArt product={item} compact/><div><h3>{item.title}</h3><span>{format(finalPrice(item))}</span><small>{item.productType === 'service' ? 'خدمت' : 'کالای فیزیکی'}</small><div className="qty"><button onClick={() => changeQty(item.id, -1)}><Icon name="minus" size={16}/></button><b>{new Intl.NumberFormat('fa-IR').format(item.qty)}</b><button onClick={() => changeQty(item.id, 1)}><Icon name="plus" size={16}/></button></div></div><button className="remove" onClick={() => setCart((prev) => { const copy = { ...prev }; delete copy[item.id]; return copy })}><Icon name="trash" size={18}/></button></div>)}</div>{!!cartItems.length && <div className="drawer-foot"><div className="price-row"><span>جمع سبد</span><strong>{format(subtotal)}</strong></div>{wallet > 0 && <div className="price-row credit"><span>پرداخت با ژتون</span><strong>− {format(walletSpend)}</strong></div>}<div className="price-row payable"><span>قابل پرداخت</span><strong>{format(gatewayAmount)}</strong></div><button className="checkout-button" onClick={openCheckout}>ادامه و ثبت سفارش <Icon name="arrow"/></button><small>پرداخت این نسخه شبیه‌سازی می‌شود.</small></div>}</aside>
    {checkoutOpen && <div className="modal-wrap" role="dialog" aria-modal="true" aria-labelledby="checkout-title"><button className="overlay" onClick={() => setCheckoutOpen(false)}/><div className="checkout-modal checkout-flow"><button className="icon-button modal-close" onClick={() => setCheckoutOpen(false)} aria-label="بستن"><Icon name="close"/></button><span className="section-tag">ONLINE CHECKOUT</span><h2 id="checkout-title">دریافت و زمان‌بندی</h2><p>برای هر مورد روش دریافت و در صورت نیاز زمان تحویل یا جلسه را مشخص کن.</p><div className="fulfillment-list">{cartItems.map((item) => <div className="fulfillment-item" key={item.id}><div><b>{item.title}</b><small>{item.seller} · {format(finalPrice(item) * item.qty)}</small></div>{item.productType === 'service' ? <span className="service-delivery">خدمت · {item.serviceMode === 'file' ? 'تحویل فایل' : item.serviceMode === 'inperson' ? 'جلسه حضوری' : 'جلسه آنلاین'}</span> : <div className="fulfillment-options">{item.deliveryMethods.includes('pickup') && <button className={checkoutChoices[item.id] === 'pickup' ? 'active' : ''} onClick={() => setCheckoutChoices((prev) => ({ ...prev, [item.id]: 'pickup' }))}>تحویل دانشگاه</button>}{item.deliveryMethods.includes('shipping') && <button className={checkoutChoices[item.id] === 'shipping' ? 'active' : ''} onClick={() => setCheckoutChoices((prev) => ({ ...prev, [item.id]: 'shipping' }))}>ارسال به آدرس</button>}</div>}{['pickup', 'service'].includes(checkoutChoices[item.id]) && <label className="slot-field">{item.productType === 'service' ? 'زمان جلسه/تحویل' : 'زمان تحویل در دانشگاه'}<input type="datetime-local" value={pickupSlots[item.id] || ''} onChange={(e) => { setPickupSlots((prev) => ({ ...prev, [item.id]: e.target.value })); setCheckoutError('') }}/><small>{item.productType === 'service' ? `زمان‌های پیشنهادی: ${item.availableSlots}` : `محل: ${item.pickupLocation}`}</small></label>}</div>)}</div>{cartItems.some((item) => checkoutChoices[item.id] === 'shipping') && <label className="address-field">آدرس کامل ارسال<textarea rows="3" value={shippingAddress} onChange={(e) => { setShippingAddress(e.target.value); setCheckoutError('') }} placeholder="شهر، خیابان، کوچه، پلاک و کدپستی"/></label>}<div className="form-message error" role="alert">{checkoutError}</div><div className="checkout-summary"><span><small>سفارش</small><b>{format(subtotal)}</b></span><span><small>ژتون</small><b>{format(walletSpend)}</b></span><span><small>پرداخت آنلاین</small><b>{format(gatewayAmount)}</b></span></div><button className="confirm-button" onClick={completeOrder}>تأیید و پرداخت آنلاین آزمایشی <Icon name="check"/></button><small className="escrow-note">برای تحویل حضوری یک کد چهاررقمی ساخته می‌شود؛ خریدار دریافت را تأیید می‌کند و بعد تسویه انجام می‌شود.</small></div></div>}
    {successOrder && <div className="modal-wrap"><button className="overlay" onClick={() => setSuccessOrder(null)}/><div className="success-modal"><span className="success-burst"><Icon name="check" size={34}/></span><h2>سفارش ثبت شد.</h2><p>موجودی و ژتون به‌روزرسانی شدند.</p><div className="order-code"><small>کد سفارش</small><b>{successOrder.id}</b></div><button onClick={() => setSuccessOrder(null)}>برگشت به Polyshop</button></div></div>}
    {selectedProduct && <ProductDetail product={selectedProduct} reviews={reviews} bids={bids} now={now} session={session} favorite={favorites.includes(selectedProduct.id)} onFavorite={toggleFavorite} onClose={() => setSelectedProduct(null)} onAdd={addToCart} onRequireLogin={() => setLoginOpen(true)} onReview={addReview} onOffer={addOffer} onReport={addReport} onBid={addBid}/>} 
    {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} onLogin={(value) => { setSession(value); setLoginOpen(false); setPortalOpen(value.role === 'admin'); setToast(value.role === 'customer' ? 'خوش اومدی؛ فروشگاه همین‌جاست' : 'وارد پنل مدیریت شدی') }}/>} 
    <SupportWidget session={session} messages={supportMessages} onRequireLogin={() => setLoginOpen(true)} onSend={sendSupport}/>
    <div className={`toast ${toast ? 'show' : ''}`} role="status"><Icon name="check" size={19}/>{toast}</div>
  </div>
}

export default App
