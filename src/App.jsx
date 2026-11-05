import { useEffect, useMemo, useState } from 'react'
import AccountPortal from './components/AccountPortal'
import { categories, demoCoupons, marketplaceCategories, products, studentProducts } from './data/products'

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
function safeRead(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback } }

function ProductArt({ product, compact = false }) {
  const marks = { tee: 'CTRL', 'tee-alt': '404', hoodie: '02:17', pin: 'IE', tote: 'B!', poster: 'Aa', cv: 'CV', ticket: 'ADMIT', book: 'BOOK', calc: '123' }
  return <div className={`product-art tone-${product.tone || 'turquoise'} ${compact ? 'compact' : ''}`}><span className="art-grid" aria-hidden="true"/><div className={`merch-shape shape-${product.art || 'book'}`} aria-hidden="true"><b>{marks[product.art] || 'B!'}</b></div>{!compact && <><span className="art-code">BF/{product.id.slice(0, 3).toUpperCase()}</span><span className="art-star"><Icon name="sparkle" size={18}/></span></>}</div>
}
function BrandMark() { return <span className="brand-mark" aria-hidden="true"><i>B</i><span/></span> }

function ProductCard({ product, addToCart, market = false }) {
  const price = finalPrice(product)
  return <article className={`product-card ${market ? 'market-card' : ''}`}><div className="product-media">{product.badge && <span className="product-badge">{product.badge}</span>}{product.discount > 0 && <span className="discount-badge">{new Intl.NumberFormat('fa-IR').format(product.discount)}٪-</span>}<ProductArt product={product}/></div><div className="product-body"><div className="product-meta"><span>{product.category}</span><span className={product.stock <= 1 ? 'low-stock' : ''}>{product.stock ? `${new Intl.NumberFormat('fa-IR').format(product.stock)} موجود` : 'ناموجود'}</span></div><h3>{product.title}</h3>{market && <div className="seller-line"><Icon name="user" size={15}/>{product.seller}</div>}<p>{product.blurb}</p><div className="product-foot"><div>{product.discount > 0 && <del>{format(product.price)}</del>}<strong>{format(price)}</strong><small>{product.color}</small></div><button disabled={!product.stock} onClick={() => addToCart(product)} aria-label={`افزودن ${product.title} به سبد`}><Icon name={product.stock ? 'plus' : 'close'} size={20}/><span>{product.stock ? 'افزودن' : 'تمام شد'}</span></button></div></div></article>
}

function LoginModal({ onClose, onLogin }) {
  const [role, setRole] = useState('customer')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const submit = (event) => { event.preventDefault(); if (role === 'customer' && !name.trim()) return setError('اسمت را وارد کن.'); if (role === 'admin' && password !== 'admin1405') return setError('رمز مدیریت درست نیست.'); onLogin({ role, name: role === 'admin' ? 'مدیر بوفه' : name.trim() }) }
  return <div className="modal-wrap login-wrap" role="dialog" aria-modal="true" aria-labelledby="login-title"><button className="overlay" aria-label="بستن ورود" onClick={onClose}/><div className="login-modal"><button className="icon-button modal-close" onClick={onClose} aria-label="بستن"><Icon name="close"/></button><BrandMark/><span className="section-tag">WELCOME TO BOOFEH</span><h2 id="login-title">چطور وارد می‌شی؟</h2><div className="role-switch"><button className={role === 'customer' ? 'active' : ''} onClick={() => { setRole('customer'); setError('') }}><Icon name="user"/><b>مشتری</b><small>خرید و ثبت آگهی</small></button><button className={role === 'admin' ? 'active' : ''} onClick={() => { setRole('admin'); setError('') }}><Icon name="store"/><b>مدیریت</b><small>کنترل فروشگاه</small></button></div><form onSubmit={submit}>{role === 'customer' ? <label>نام نمایشی<input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً محمد، صنایع ۱۴۰۲" autoFocus/></label> : <><label>رمز مدیریت<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="رمز آزمایشی" autoFocus/></label><div className="login-hint">برای تست مدیریت: <code>admin1405</code></div></>}<div className="form-message error" aria-live="polite">{error}</div><button className="confirm-button" type="submit">ورود به {role === 'admin' ? 'پنل مدیریت' : 'حساب مشتری'} <Icon name="arrow"/></button></form><p>این ورود در نسخه فعلی نمایشی و فقط روی همین مرورگر ذخیره می‌شود.</p></div></div>
}

function App() {
  const seed = [...products, ...studentProducts]
  const [catalog, setCatalog] = useState(() => safeRead('boofeh-catalog-v2', seed))
  const [activeCategory, setActiveCategory] = useState('همه')
  const [marketCategory, setMarketCategory] = useState('همه')
  const [query, setQuery] = useState('')
  const [cart, setCart] = useState(() => safeRead('boofeh-cart-v2', {}))
  const [wallet, setWallet] = useState(() => safeRead('boofeh-wallet', 0))
  const [usedCoupons, setUsedCoupons] = useState(() => safeRead('boofeh-coupons', []))
  const [session, setSession] = useState(() => safeRead('boofeh-session', null))
  const [coupon, setCoupon] = useState('')
  const [couponState, setCouponState] = useState({ type: '', message: '' })
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [successOrder, setSuccessOrder] = useState(null)
  const [loginOpen, setLoginOpen] = useState(false)
  const [portalOpen, setPortalOpen] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => localStorage.setItem('boofeh-catalog-v2', JSON.stringify(catalog)), [catalog])
  useEffect(() => localStorage.setItem('boofeh-cart-v2', JSON.stringify(cart)), [cart])
  useEffect(() => localStorage.setItem('boofeh-wallet', JSON.stringify(wallet)), [wallet])
  useEffect(() => localStorage.setItem('boofeh-coupons', JSON.stringify(usedCoupons)), [usedCoupons])
  useEffect(() => localStorage.setItem('boofeh-session', JSON.stringify(session)), [session])
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 2600); return () => clearTimeout(timer) }, [toast])
  useEffect(() => { const modalOpen = cartOpen || checkoutOpen || successOrder || loginOpen || portalOpen; document.body.style.overflow = modalOpen ? 'hidden' : ''; const close = (e) => { if (e.key === 'Escape') { setCartOpen(false); setCheckoutOpen(false); setSuccessOrder(null); setLoginOpen(false); setPortalOpen(false) } }; window.addEventListener('keydown', close); return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', close) } }, [cartOpen, checkoutOpen, successOrder, loginOpen, portalOpen])

  const official = useMemo(() => catalog.filter((p) => p.source === 'official' && p.status === 'approved' && (activeCategory === 'همه' || p.category === activeCategory) && `${p.title} ${p.category} ${p.blurb}`.toLowerCase().includes(query.trim().toLowerCase())), [catalog, activeCategory, query])
  const marketplace = useMemo(() => catalog.filter((p) => p.source === 'student' && p.status === 'approved' && (marketCategory === 'همه' || p.category === marketCategory)), [catalog, marketCategory])
  const cartItems = useMemo(() => catalog.filter((p) => cart[p.id]).map((p) => ({ ...p, qty: cart[p.id] })), [catalog, cart])
  const cartCount = cartItems.reduce((sum, item) => sum + item.qty, 0)
  const subtotal = cartItems.reduce((sum, item) => sum + finalPrice(item) * item.qty, 0)
  const walletSpend = Math.min(wallet, subtotal), gatewayAmount = Math.max(0, subtotal - walletSpend)

  const addToCart = (product) => { const current = cart[product.id] || 0; if (product.stock <= current) return setToast('بیشتر از موجودی نمی‌شود اضافه کرد'); setCart((prev) => ({ ...prev, [product.id]: current + 1 })); setToast(`${product.title} رفت توی سبد`) }
  const changeQty = (id, delta) => setCart((prev) => { const next = (prev[id] || 0) + delta, product = catalog.find((p) => p.id === id); if (next <= 0) { const copy = { ...prev }; delete copy[id]; return copy } if (next > (product?.stock || 0)) { setToast('این تمام موجودی فعلی است'); return prev } return { ...prev, [id]: next } })
  const applyCoupon = (event) => { event.preventDefault(); const code = coupon.trim().toUpperCase(); if (!code) return setCouponState({ type: 'error', message: 'اول کد را وارد کن.' }); if (!demoCoupons[code]) return setCouponState({ type: 'error', message: 'این کد را پیدا نکردیم.' }); if (usedCoupons.includes(code)) return setCouponState({ type: 'error', message: 'این کوپن قبلاً مصرف شده.' }); const reward = demoCoupons[code]; setWallet((v) => v + reward.amount); setUsedCoupons((v) => [...v, code]); setCouponState({ type: 'success', message: `${format(reward.amount)} ژتون اضافه شد.` }); setCoupon('') }
  const completeOrder = () => { const id = `BF-${new Intl.NumberFormat('fa-IR', { useGrouping: false }).format(Math.floor(1000 + Math.random() * 8999))}`; setWallet((v) => Math.max(0, v - walletSpend)); setCatalog((prev) => prev.map((p) => cart[p.id] ? { ...p, stock: Math.max(0, p.stock - cart[p.id]) } : p)); setCart({}); setCheckoutOpen(false); setSuccessOrder({ id }) }
  const openAccount = () => session ? setPortalOpen(true) : setLoginOpen(true)
  const addProduct = (data) => { const id = `${data.source}-${Date.now()}`; setCatalog((prev) => [{ ...data, id, tone: data.tone || (data.source === 'official' ? 'turquoise' : 'cream'), art: data.art || 'book' }, ...prev]); setToast(data.status === 'pending' ? 'آگهی برای بررسی ارسال شد' : 'محصول منتشر شد') }
  const updateProduct = (id, data) => { setCatalog((prev) => prev.map((p) => p.id === id ? { ...p, ...data, id } : p)); setToast('تغییرات ذخیره شد') }
  const approveProduct = (id) => { setCatalog((prev) => prev.map((p) => p.id === id ? { ...p, status: 'approved', badge: p.badge || 'تازه منتشرشده' } : p)); setToast('آگهی تأیید و منتشر شد') }
  const deleteProduct = (id) => { setCatalog((prev) => prev.filter((p) => p.id !== id)); setCart((prev) => { const copy = { ...prev }; delete copy[id]; return copy }); setToast('محصول حذف شد') }

  return <div className="app-shell" id="top">
    <div className="announcement"><span>فروشگاه رسمی + بازار دانشجویی</span><b>•</b><span>پرداخت فعلاً شبیه‌سازی می‌شود</span><b>•</b><span>ثبت آگهی برای همه دانشجوها</span></div>
    <header className="site-header"><a className="brand" href="#top" aria-label="بوفه، صفحه اصلی"><BrandMark/><span><b>بوفه</b><small>BOOFEH MARKET</small></span></a><nav aria-label="ناوبری اصلی"><a href="#official">فروشگاه بوفه</a><a href="#market">بازار دانشجویی</a><a href="#coupon">ژتون</a></nav><div className="header-actions"><button className="account-button" onClick={openAccount}><Icon name="user"/><span><small>{session ? session.role === 'admin' ? 'مدیریت' : 'حساب من' : 'ورود'}</small><b>{session?.name || 'مشتری / مدیر'}</b></span></button><button className="cart-button" onClick={() => setCartOpen(true)} aria-label={`سبد خرید با ${cartCount} کالا`}><Icon name="bag"/><span>سبد</span>{cartCount > 0 && <b>{new Intl.NumberFormat('fa-IR').format(cartCount)}</b>}</button></div></header>
    <main>
      <section className="hero"><div className="hero-copy"><div className="eyebrow"><span>بازارچه کوچک دانشگاه</span><i>حالا دو بخشه</i></div><h1>هم از بوفه بخر،<br/>هم از <em>هم‌دانشگاهیت.</em></h1><p>مرچ و خدمات اختصاصی بوفه یک طرف؛ کتاب‌ها، وسایل و چیزهایی که دانشجوهای دیگر برای فروش گذاشته‌اند یک طرف دیگر.</p><div className="hero-actions"><a className="primary-button" href="#official">فروشگاه رسمی <Icon name="arrow"/></a><a className="ghost-link" href="#market"><Icon name="store" size={19}/> بازار دانشجویی</a></div><div className="trust-row"><span><Icon name="check" size={17}/> آگهی‌های تأییدشده</span><span><Icon name="check" size={17}/> موجودی شفاف</span><span><Icon name="check" size={17}/> خرید با ژتون</span></div></div><div className="hero-stage" aria-label="کلاژ نمایشی محصولات بوفه"><div className="blob blob-one"/><div className="blob blob-two"/><div className="hero-product"><span>BOOFEH<br/>SUPPLY<br/>CLUB</span><b>OFFICIAL</b></div><div className="hero-ticket"><small>STUDENT MARKET</small><b>خرید و فروش</b><span>بین خود بچه‌ها</span></div><div className="hero-pin">B!</div><span className="scribble">دو فروشگاه<br/>یک بوفه</span></div></section>
      <section className="ticker" aria-hidden="true"><div>فروشگاه رسمی <b>✦</b> بازار دست‌دوم <b>✦</b> ثبت آگهی دانشجویی <b>✦</b> ژتون جایزه <b>✦</b> فروشگاه رسمی <b>✦</b> بازار دست‌دوم</div></section>
      <section className="shop-section official-section" id="official"><div className="section-head"><div><span className="section-tag">BOOFEH OFFICIAL / 01</span><h2>فروشگاه رسمی بوفه</h2></div><p>محصول‌هایی که خود بوفه طراحی، تهیه و با موجودی مشخص عرضه می‌کند.</p></div><div className="section-identity official-identity"><Icon name="check"/><span><b>فروشنده: خود بوفه</b><small>تولید و تأمین مستقیم</small></span></div><div className="shop-toolbar"><div className="categories">{categories.map((c) => <button key={c} className={activeCategory === c ? 'active' : ''} onClick={() => setActiveCategory(c)}>{c}</button>)}</div><label className="search-box"><span className="sr-only">جست‌وجوی محصول رسمی</span><Icon name="search" size={20}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="توی فروشگاه بگرد..."/></label></div><div className="product-grid">{official.map((p) => <ProductCard key={p.id} product={p} addToCart={addToCart}/>)}</div></section>
      <section className="marketplace-section" id="market"><div className="market-head"><div><span className="section-tag">STUDENT TO STUDENT</span><h2>بازار دانشجویی</h2><p>کتاب، جزوه، لباس فارغ‌التحصیلی و وسایلی که دیگر به کار یک دانشجو نمی‌آیند، شاید دقیقاً به درد دانشجوی دیگری بخورند.</p></div><button onClick={openAccount}><Icon name="plus"/> محصولت رو بفروش</button></div><div className="section-identity market-identity"><Icon name="user"/><span><b>فروشنده‌ها: دانشجوهای دانشگاه</b><small>همه آگهی‌ها قبل از انتشار بررسی می‌شوند</small></span></div><div className="categories market-categories">{marketplaceCategories.map((c) => <button key={c} className={marketCategory === c ? 'active' : ''} onClick={() => setMarketCategory(c)}>{c}</button>)}</div><div className="product-grid market-grid">{marketplace.map((p) => <ProductCard key={p.id} product={p} addToCart={addToCart} market/>)}</div></section>
      <section className="sell-banner"><div><span className="section-tag">GIVE IT A SECOND LIFE</span><h2>دیگه لازمَش نداری؟<br/>یکی دیگه شاید لازم داشته باشه.</h2><p>با حساب مشتری وارد شو، محصول را ثبت کن و بعد از تأیید مدیریت در بازار دانشجویی بفروشش.</p></div><button onClick={openAccount}>ثبت آگهی رایگان <Icon name="arrow"/></button></section>
      <section className="coupon-section" id="coupon"><div className="coupon-copy"><span className="section-tag">COUPON → WALLET</span><h2>کدت رو بزن،<br/>ژتون بگیر.</h2><p>کوپن مسابقه یا رویداد را وارد کن تا اعتبارش به کیف پول بوفه اضافه شود.</p><div className="demo-hint"><span>برای تست</span><code>BOOFEH50</code><small>۵۰ هزار تومان ژتون</small></div></div><div className="wallet-card"><div className="wallet-top"><span><Icon name="wallet"/> کیف پول بوفه</span><small>موجودی فعلی</small><strong>{format(wallet)}</strong></div><form onSubmit={applyCoupon}><label htmlFor="coupon-code">کد کوپن</label><div className="coupon-input"><input id="coupon-code" value={coupon} onChange={(e) => { setCoupon(e.target.value); setCouponState({ type: '', message: '' }) }} placeholder="مثلاً BOOFEH50"/><button type="submit">ثبت کد</button></div><div className={`form-message ${couponState.type}`} aria-live="polite">{couponState.message}</div></form></div></section>
    </main>
    <footer><div className="footer-brand"><BrandMark/><span><b>بوفه</b><small>خرید کن. بفروش. دوباره استفاده کن.</small></span></div><p>یک پروژه مستقل دانشجویی؛ محصولات رسمی و آگهی‌های دانشجویی در دو بخش مجزا نمایش داده می‌شوند.</p><div className="footer-links"><a href="#official">رسمی</a><a href="#market">دانشجویی</a><a href="#coupon">ژتون</a></div><small>© ۲۰۲۶ BOOFEH MARKET — MADE BETWEEN CLASSES.</small></footer>
    <nav className="mobile-dock" aria-label="ناوبری موبایل"><a href="#official"><Icon name="home"/><span>رسمی</span></a><a href="#market"><Icon name="store"/><span>دانشجویی</span></a><button onClick={openAccount}><Icon name="user"/><span>حساب</span></button><button onClick={() => setCartOpen(true)}><Icon name="bag"/><span>سبد</span>{cartCount > 0 && <b>{new Intl.NumberFormat('fa-IR').format(cartCount)}</b>}</button></nav>
    {cartOpen && <button className="overlay" aria-label="بستن سبد" onClick={() => setCartOpen(false)}/>}<aside className={`cart-drawer ${cartOpen ? 'open' : ''}`} aria-hidden={!cartOpen}><div className="drawer-head"><div><span className="section-tag">YOUR PICKS</span><h2>سبد بوفه <b>{new Intl.NumberFormat('fa-IR').format(cartCount)}</b></h2></div><button className="icon-button" onClick={() => setCartOpen(false)} aria-label="بستن سبد"><Icon name="close"/></button></div><div className="cart-list">{!cartItems.length ? <div className="empty-cart"><span><Icon name="bag" size={34}/></span><h3>هنوز چیزی برنداشتی</h3><p>هر دو بخش فروشگاه را بگرد.</p></div> : cartItems.map((item) => <div className="cart-line" key={item.id}><ProductArt product={item} compact/><div><h3>{item.title}</h3><span>{format(finalPrice(item))}</span><div className="qty"><button onClick={() => changeQty(item.id, -1)}><Icon name="minus" size={16}/></button><b>{new Intl.NumberFormat('fa-IR').format(item.qty)}</b><button onClick={() => changeQty(item.id, 1)}><Icon name="plus" size={16}/></button></div></div><button className="remove" onClick={() => setCart((prev) => { const copy = { ...prev }; delete copy[item.id]; return copy })}><Icon name="trash" size={18}/></button></div>)}</div>{!!cartItems.length && <div className="drawer-foot"><div className="price-row"><span>جمع سبد</span><strong>{format(subtotal)}</strong></div>{wallet > 0 && <div className="price-row credit"><span>پرداخت با ژتون</span><strong>− {format(walletSpend)}</strong></div>}<div className="price-row payable"><span>قابل پرداخت</span><strong>{format(gatewayAmount)}</strong></div><button className="checkout-button" onClick={() => { setCartOpen(false); setCheckoutOpen(true) }}>ادامه و ثبت سفارش <Icon name="arrow"/></button><small>پرداخت این نسخه شبیه‌سازی می‌شود.</small></div>}</aside>
    {checkoutOpen && <div className="modal-wrap" role="dialog" aria-modal="true"><button className="overlay" onClick={() => setCheckoutOpen(false)}/><div className="checkout-modal"><button className="icon-button modal-close" onClick={() => setCheckoutOpen(false)}><Icon name="close"/></button><span className="modal-icon"><Icon name="bag"/></span><h2>سفارش آماده ثبت است</h2><p>پس از تأیید، پرداخت آزمایشی موفق و موجودی کم می‌شود.</p><div className="checkout-summary"><span><small>سفارش</small><b>{format(subtotal)}</b></span><span><small>ژتون</small><b>{format(walletSpend)}</b></span><span><small>درگاه</small><b>{format(gatewayAmount)}</b></span></div><button className="confirm-button" onClick={completeOrder}>تأیید و پرداخت آزمایشی <Icon name="check"/></button></div></div>}
    {successOrder && <div className="modal-wrap"><button className="overlay" onClick={() => setSuccessOrder(null)}/><div className="success-modal"><span className="success-burst"><Icon name="check" size={34}/></span><h2>سفارش ثبت شد.</h2><p>موجودی و ژتون به‌روزرسانی شدند.</p><div className="order-code"><small>کد سفارش</small><b>{successOrder.id}</b></div><button onClick={() => setSuccessOrder(null)}>برگشت به بوفه</button></div></div>}
    {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} onLogin={(value) => { setSession(value); setLoginOpen(false); setPortalOpen(true) }}/>} 
    {portalOpen && session && <AccountPortal session={session} catalog={catalog} onClose={() => setPortalOpen(false)} onLogout={() => { setSession(null); setPortalOpen(false); setToast('از حساب خارج شدی') }} onAdd={addProduct} onUpdate={updateProduct} onApprove={approveProduct} onDelete={deleteProduct}/>} 
    <div className={`toast ${toast ? 'show' : ''}`} role="status"><Icon name="check" size={19}/>{toast}</div>
  </div>
}

export default App
