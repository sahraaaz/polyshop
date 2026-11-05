import { useEffect, useMemo, useState } from 'react'
import { categories, demoCoupons, products } from './data/products'

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
}

function Icon({ name, size = 22 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name]}</svg> }
const format = (value) => `${new Intl.NumberFormat('fa-IR').format(value)} تومان`
function safeRead(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback } }

function ProductArt({ product, compact = false }) {
  const marks = { tee: 'CTRL', 'tee-alt': '404', hoodie: '02:17', pin: 'IE', tote: 'B!', poster: 'Aa', cv: 'CV', ticket: 'ADMIT' }
  return <div className={`product-art tone-${product.tone} ${compact ? 'compact' : ''}`}><span className="art-grid" aria-hidden="true"/><div className={`merch-shape shape-${product.art}`} aria-hidden="true"><b>{marks[product.art]}</b></div>{!compact && <><span className="art-code">BF/{product.id.slice(0, 3).toUpperCase()}</span><span className="art-star"><Icon name="sparkle" size={18}/></span></>}</div>
}
function BrandMark() { return <span className="brand-mark" aria-hidden="true"><i>B</i><span/></span> }

function App() {
  const initialStock = Object.fromEntries(products.map((product) => [product.id, product.stock]))
  const [activeCategory, setActiveCategory] = useState('همه')
  const [query, setQuery] = useState('')
  const [cart, setCart] = useState(() => safeRead('boofeh-cart', {}))
  const [stock, setStock] = useState(() => ({ ...initialStock, ...safeRead('boofeh-stock', {}) }))
  const [wallet, setWallet] = useState(() => safeRead('boofeh-wallet', 0))
  const [usedCoupons, setUsedCoupons] = useState(() => safeRead('boofeh-coupons', []))
  const [coupon, setCoupon] = useState('')
  const [couponState, setCouponState] = useState({ type: '', message: '' })
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [successOrder, setSuccessOrder] = useState(null)
  const [toast, setToast] = useState('')

  useEffect(() => localStorage.setItem('boofeh-cart', JSON.stringify(cart)), [cart])
  useEffect(() => localStorage.setItem('boofeh-stock', JSON.stringify(stock)), [stock])
  useEffect(() => localStorage.setItem('boofeh-wallet', JSON.stringify(wallet)), [wallet])
  useEffect(() => localStorage.setItem('boofeh-coupons', JSON.stringify(usedCoupons)), [usedCoupons])
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 2500); return () => clearTimeout(timer) }, [toast])
  useEffect(() => {
    const modalOpen = cartOpen || checkoutOpen || successOrder
    document.body.style.overflow = modalOpen ? 'hidden' : ''
    const close = (event) => { if (event.key === 'Escape') { setCartOpen(false); setCheckoutOpen(false); setSuccessOrder(null) } }
    window.addEventListener('keydown', close)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', close) }
  }, [cartOpen, checkoutOpen, successOrder])

  const visibleProducts = useMemo(() => products.filter((product) => {
    const matchesCategory = activeCategory === 'همه' || product.category === activeCategory
    return matchesCategory && `${product.title} ${product.subtitle} ${product.category} ${product.blurb}`.toLowerCase().includes(query.trim().toLowerCase())
  }), [activeCategory, query])
  const cartItems = useMemo(() => products.filter((product) => cart[product.id]).map((product) => ({ ...product, qty: cart[product.id] })), [cart])
  const cartCount = cartItems.reduce((sum, item) => sum + item.qty, 0)
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0)
  const walletSpend = Math.min(wallet, subtotal)
  const gatewayAmount = Math.max(0, subtotal - walletSpend)

  const addToCart = (product) => {
    const available = stock[product.id] || 0, current = cart[product.id] || 0
    if (available <= current) return setToast('بیشتر از موجودی نمی‌شود به سبد اضافه کرد')
    setCart((prev) => ({ ...prev, [product.id]: current + 1 })); setToast(`${product.title} رفت توی سبد`)
  }
  const changeQty = (id, delta) => setCart((prev) => {
    const next = (prev[id] || 0) + delta
    if (next <= 0) { const copy = { ...prev }; delete copy[id]; return copy }
    if (next > (stock[id] || 0)) { setToast('این تمام موجودی فعلی ماست'); return prev }
    return { ...prev, [id]: next }
  })
  const applyCoupon = (event) => {
    event.preventDefault(); const normalized = coupon.trim().toUpperCase()
    if (!normalized) return setCouponState({ type: 'error', message: 'اول کد روی کوپن را وارد کن.' })
    if (!demoCoupons[normalized]) return setCouponState({ type: 'error', message: 'این کد را پیدا نکردیم؛ دوباره چکش کن.' })
    if (usedCoupons.includes(normalized)) return setCouponState({ type: 'error', message: 'این کوپن قبلاً روی همین مرورگر مصرف شده.' })
    const reward = demoCoupons[normalized]
    setWallet((prev) => prev + reward.amount); setUsedCoupons((prev) => [...prev, normalized]); setCouponState({ type: 'success', message: `${format(reward.amount)} ژتون به کیف پولت اضافه شد.` }); setCoupon('')
  }
  const completeOrder = () => {
    const orderId = `BF-${new Intl.NumberFormat('fa-IR', { useGrouping: false }).format(Math.floor(1000 + Math.random() * 8999))}`
    setWallet((prev) => Math.max(0, prev - walletSpend))
    setStock((prev) => { const updated = { ...prev }; cartItems.forEach((item) => { updated[item.id] = Math.max(0, updated[item.id] - item.qty) }); return updated })
    setCart({}); setCheckoutOpen(false); setSuccessOrder({ id: orderId, total: subtotal, gateway: gatewayAmount })
  }

  return <div className="app-shell" id="top">
    <div className="announcement"><span>دراپ آزمایشی بوفه بازه</span><b>•</b><span>پرداخت فعلاً شبیه‌سازی می‌شود</span><b>•</b><span>ارسال واقعی نداریم</span></div>
    <header className="site-header">
      <a className="brand" href="#top" aria-label="بوفه، صفحه اصلی"><BrandMark/><span><b>بوفه</b><small>BOOFEH MARKET</small></span></a>
      <nav aria-label="ناوبری اصلی"><a href="#shop">فروشگاه</a><a href="#coupon">کوپن مسابقات</a><a href="#about">قصه بوفه</a></nav>
      <div className="header-actions"><button className="wallet-button" onClick={() => document.getElementById('coupon')?.scrollIntoView({ behavior: 'smooth' })} aria-label={`موجودی ژتون ${format(wallet)}`}><Icon name="wallet"/><span><small>ژتون من</small><b>{format(wallet)}</b></span></button><button className="cart-button" onClick={() => setCartOpen(true)} aria-label={`سبد خرید با ${cartCount} کالا`}><Icon name="bag"/><span>سبد</span>{cartCount > 0 && <b>{new Intl.NumberFormat('fa-IR').format(cartCount)}</b>}</button></div>
    </header>

    <main>
      <section className="hero"><div className="hero-copy"><div className="eyebrow"><span>بازارچه کوچک دانشگاه</span><i>نسخه بتا</i></div><h1>هرچی برای ترم<br/>لازم داری، <em>اینجاست.</em></h1><p>از تیشرت و پیکسل تا طراحی پوستر و کلینیک رزومه؛ بوفه جاییه برای خرید چیزهای باحال ساخته‌شده توسط خود بچه‌های دانشگاه.</p><div className="hero-actions"><a className="primary-button" href="#shop">بریم فروشگاه <Icon name="arrow"/></a><a className="ghost-link" href="#coupon"><Icon name="ticket" size={19}/> کوپن داری؟</a></div><div className="trust-row"><span><Icon name="check" size={17}/> موجودی شفاف</span><span><Icon name="check" size={17}/> خرید با ژتون</span><span><Icon name="check" size={17}/> مستقل و دانشجویی</span></div></div>
        <div className="hero-stage" aria-label="کلاژ نمایشی محصولات بوفه"><div className="blob blob-one"/><div className="blob blob-two"/><div className="hero-product hero-shirt-card"><span>BOOFEH<br/>SUPPLY<br/>CLUB</span><b>DROP 01</b></div><div className="hero-ticket"><small>GOOD FOR</small><b>۵۰,۰۰۰</b><span>ژتون بوفه</span></div><div className="hero-pin">B!</div><span className="scribble">چیزای باحال<br/>برای روزای شلوغ</span></div>
      </section>
      <section className="ticker" aria-hidden="true"><div>مرچ دانشجویی <b>✦</b> خدمات خلاق <b>✦</b> ژتون جایزه <b>✦</b> ساخته بچه‌های دانشگاه <b>✦</b> مرچ دانشجویی <b>✦</b> خدمات خلاق</div></section>

      <section className="shop-section" id="shop"><div className="section-head"><div><span className="section-tag">BOOFEH PICKS / 01</span><h2>قفسه‌های امروز</h2></div><p>محصول‌ها و خدمات فعلاً نمونه‌اند، ولی موجودی و فرایند خرید مثل یک فروشگاه واقعی کار می‌کند.</p></div><div className="shop-toolbar"><div className="categories" role="tablist" aria-label="دسته‌بندی محصولات">{categories.map((category) => <button key={category} className={activeCategory === category ? 'active' : ''} onClick={() => setActiveCategory(category)}>{category}</button>)}</div><label className="search-box"><span className="sr-only">جست‌وجوی محصول یا خدمت</span><Icon name="search" size={20}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="چی لازم داری؟"/></label></div>
        <div className="product-grid">{visibleProducts.map((product) => { const available = stock[product.id] || 0; return <article className="product-card" key={product.id}><div className="product-media">{product.badge && <span className="product-badge">{product.badge}</span>}<ProductArt product={product}/></div><div className="product-body"><div className="product-meta"><span>{product.category}</span><span className={available <= 3 ? 'low-stock' : ''}>{available ? `${new Intl.NumberFormat('fa-IR').format(available)} موجود` : 'ناموجود'}</span></div><h3>{product.title}</h3><p>{product.blurb}</p><div className="product-foot"><div><strong>{format(product.price)}</strong><small>{product.color}</small></div><button disabled={!available} onClick={() => addToCart(product)} aria-label={`افزودن ${product.title} به سبد`}><Icon name={available ? 'plus' : 'close'} size={20}/><span>{available ? 'افزودن' : 'تمام شد'}</span></button></div></div></article> })}</div>
        {!visibleProducts.length && <div className="empty-results"><Icon name="search" size={30}/><h3>چیزی روی این قفسه نیست</h3><p>فیلتر یا عبارت جست‌وجو را عوض کن.</p></div>}
      </section>

      <section className="coupon-section" id="coupon"><div className="coupon-copy"><span className="section-tag">COUPON → WALLET</span><h2>کدت رو بزن،<br/>ژتون بگیر.</h2><p>توی مسابقه یا رویداد دانشکده کوپن بردی؟ کد یک‌بارمصرفت را وارد کن تا اعتبارش مستقیم به کیف پول بوفه اضافه شود.</p><div className="demo-hint"><span>برای تست</span><code>BOOFEH50</code><small>۵۰ هزار تومان ژتون آزمایشی</small></div></div><div className="wallet-card"><div className="wallet-top"><span><Icon name="wallet"/> کیف پول بوفه</span><small>موجودی فعلی</small><strong>{format(wallet)}</strong></div><form onSubmit={applyCoupon} noValidate><label htmlFor="coupon-code">کد کوپن</label><div className="coupon-input"><input id="coupon-code" value={coupon} onChange={(event) => { setCoupon(event.target.value); setCouponState({ type: '', message: '' }) }} placeholder="مثلاً BOOFEH50" autoComplete="off"/><button type="submit">ثبت کد</button></div><div className={`form-message ${couponState.type}`} aria-live="polite">{couponState.message}</div></form><div className="wallet-note"><Icon name="sparkle" size={19}/><span>ژتون در مرحله پرداخت خودکار از مبلغ سبد کم می‌شود.</span></div></div></section>

      <section className="about-section" id="about"><div className="about-stamp"><BrandMark/><b>BOOFEH<br/>STUDENT<br/>MARKET</b></div><div><span className="section-tag">WHY BOOFEH?</span><h2>بوفه‌ای که خوراکی نمی‌فروشه.</h2><p>یک مارکت‌پلیس کوچک و مستقل برای چیزهایی که زندگی دانشگاهی را کمی قشنگ‌تر، راحت‌تر یا بامزه‌تر می‌کنند. فروشنده‌ها و خدمات این نسخه آزمایشی‌اند و استفاده‌ای از نشان رسمی دانشگاه نشده است.</p></div><div className="about-points"><span><b>۰۱</b> مرچ با تیراژ محدود</span><span><b>۰۲</b> خدمات بچه‌های دانشگاه</span><span><b>۰۳</b> کوپن جایزه و کیف پول</span></div></section>
    </main>

    <footer><div className="footer-brand"><BrandMark/><span><b>بوفه</b><small>خرید کن. بساز. به بقیه هم بگو.</small></span></div><p>یک پروژه مستقل دانشجویی؛ بدون وابستگی رسمی به دانشگاه و بدون پرداخت واقعی در نسخه آزمایشی.</p><div className="footer-links"><a href="#shop">فروشگاه</a><a href="#coupon">ژتون</a><a href="#about">درباره</a></div><small>© ۲۰۲۶ BOOFEH MARKET — MADE BETWEEN CLASSES.</small></footer>
    <nav className="mobile-dock" aria-label="ناوبری موبایل"><a href="#top"><Icon name="home"/><span>خانه</span></a><a href="#shop"><Icon name="grid"/><span>فروشگاه</span></a><a href="#coupon"><Icon name="wallet"/><span>ژتون</span></a><button onClick={() => setCartOpen(true)}><Icon name="bag"/><span>سبد</span>{cartCount > 0 && <b>{new Intl.NumberFormat('fa-IR').format(cartCount)}</b>}</button></nav>

    {cartOpen && <button className="overlay" aria-label="بستن سبد" onClick={() => setCartOpen(false)}/>}<aside className={`cart-drawer ${cartOpen ? 'open' : ''}`} aria-hidden={!cartOpen}><div className="drawer-head"><div><span className="section-tag">YOUR PICKS</span><h2>سبد بوفه <b>{new Intl.NumberFormat('fa-IR').format(cartCount)}</b></h2></div><button className="icon-button" onClick={() => setCartOpen(false)} aria-label="بستن سبد"><Icon name="close"/></button></div><div className="cart-list">{!cartItems.length ? <div className="empty-cart"><span><Icon name="bag" size={34}/></span><h3>هنوز چیزی برنداشتی</h3><p>قفسه‌ها را بگرد؛ شاید چیزی دقیقاً برای تو ساخته شده.</p><button onClick={() => { setCartOpen(false); document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' }) }}>دیدن قفسه‌ها</button></div> : cartItems.map((item) => <div className="cart-line" key={item.id}><ProductArt product={item} compact/><div><h3>{item.title}</h3><span>{format(item.price)}</span><div className="qty"><button onClick={() => changeQty(item.id, -1)} aria-label="کم کردن تعداد"><Icon name="minus" size={16}/></button><b>{new Intl.NumberFormat('fa-IR').format(item.qty)}</b><button onClick={() => changeQty(item.id, 1)} aria-label="زیاد کردن تعداد"><Icon name="plus" size={16}/></button></div></div><button className="remove" onClick={() => setCart((prev) => { const copy = { ...prev }; delete copy[item.id]; return copy })} aria-label={`حذف ${item.title}`}><Icon name="trash" size={18}/></button></div>)}</div>{!!cartItems.length && <div className="drawer-foot"><div className="price-row"><span>جمع سبد</span><strong>{format(subtotal)}</strong></div>{wallet > 0 && <div className="price-row credit"><span>پرداخت با ژتون</span><strong>− {format(walletSpend)}</strong></div>}<div className="price-row payable"><span>مبلغ قابل پرداخت</span><strong>{format(gatewayAmount)}</strong></div><button className="checkout-button" onClick={() => { setCartOpen(false); setCheckoutOpen(true) }}>ادامه و ثبت سفارش <Icon name="arrow"/></button><small>پرداخت بانکی این نسخه شبیه‌سازی و پس از تأیید شما موفق ثبت می‌شود.</small></div>}</aside>

    {checkoutOpen && <div className="modal-wrap" role="dialog" aria-modal="true" aria-labelledby="checkout-title"><button className="overlay" aria-label="بستن پرداخت" onClick={() => setCheckoutOpen(false)}/><div className="checkout-modal"><button className="icon-button modal-close" onClick={() => setCheckoutOpen(false)} aria-label="بستن"><Icon name="close"/></button><span className="modal-icon"><Icon name="bag" size={28}/></span><span className="section-tag">DEMO CHECKOUT</span><h2 id="checkout-title">سفارش آماده ثبت است</h2><p>در نسخه آزمایشی، با زدن دکمه زیر مرحله درگاه به‌صورت خودکار موفق می‌شود و موجودی محصولات کم خواهد شد.</p><div className="checkout-summary"><span><small>مبلغ سفارش</small><b>{format(subtotal)}</b></span><span><small>کسر از ژتون</small><b>{format(walletSpend)}</b></span><span><small>شبیه‌سازی درگاه</small><b>{format(gatewayAmount)}</b></span></div><button className="confirm-button" onClick={completeOrder}>تأیید و پرداخت آزمایشی <Icon name="check"/></button></div></div>}
    {successOrder && <div className="modal-wrap" role="dialog" aria-modal="true" aria-labelledby="success-title"><button className="overlay" aria-label="بستن رسید" onClick={() => setSuccessOrder(null)}/><div className="success-modal"><span className="success-burst"><Icon name="check" size={34}/></span><span className="section-tag">ORDER COMPLETE</span><h2 id="success-title">گرفتیمش! سفارش ثبت شد.</h2><p>پرداخت این نسخه آزمایشی است، اما موجودی و ژتون دقیقاً مثل خرید واقعی به‌روزرسانی شدند.</p><div className="order-code"><small>کد سفارش</small><b>{successOrder.id}</b></div><button onClick={() => setSuccessOrder(null)}>برگشت به بوفه</button></div></div>}
    <div className={`toast ${toast ? 'show' : ''}`} role="status"><Icon name="check" size={19}/>{toast}</div>
  </div>
}

export default App
