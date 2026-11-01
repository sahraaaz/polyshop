import { useEffect, useMemo, useState } from 'react'

const products = [
  { id: 1, name: 'تیشرت «بهینه‌سازی»', en: 'OPTIMIZE TEE', category: 'پوشیدنی', price: 690000, color: 'سبز سیگنال', tone: 'lime', art: 'tee', label: 'محبوب' },
  { id: 2, name: 'هودی «شیفت شب»', en: 'NIGHT SHIFT HOODIE', category: 'پوشیدنی', price: 1290000, color: 'سرمه‌ای', tone: 'navy', art: 'hoodie', label: 'جدید' },
  { id: 3, name: 'ماگ «یک سیمپلکس دیگه»', en: 'ONE MORE SIMPLEX', category: 'روزمره', price: 340000, color: 'سفید مات', tone: 'cream', art: 'mug' },
  { id: 4, name: 'توت‌بگ «زنجیره تأمین»', en: 'SUPPLY CHAIN CLUB', category: 'روزمره', price: 470000, color: 'کتان طبیعی', tone: 'sand', art: 'tote' },
  { id: 5, name: 'کپ «IE Dept.»', en: 'INDUSTRIAL MINDSET', category: 'اکسسوری', price: 520000, color: 'ذغالی', tone: 'charcoal', art: 'cap' },
  { id: 6, name: 'دفتر «نمودار گانت»', en: 'MAKE IT HAPPEN', category: 'لوازم تحریر', price: 290000, color: 'سبز تیره', tone: 'forest', art: 'notebook' },
]

const categories = ['همه', 'پوشیدنی', 'روزمره', 'اکسسوری', 'لوازم تحریر']

const icons = {
  bag: <><path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></>,
  heart: <path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6l1.2 1.2L12 21l7.6-7.6 1.2-1.2a5.4 5.4 0 0 0 0-7.6Z"/>,
  arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
  close: <><path d="m6 6 12 12"/><path d="M18 6 6 18"/></>,
  menu: <><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></>,
  minus: <path d="M5 12h14"/>,
  plus: <><path d="M5 12h14"/><path d="M12 5v14"/></>,
  trash: <><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="m7 7 1 13h8l1-13"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
}

function Icon({ name, size = 22, filled = false }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name]}</svg>
}

function ProductArtwork({ product, compact = false }) {
  const label = product.id === 1 ? '∑ OPT' : product.id === 2 ? '03:17' : product.id === 3 ? '⟲' : product.id === 4 ? '→ ● →' : product.id === 5 ? 'IE' : 'GANTT'
  return (
    <div className={`art-stage tone-${product.tone} ${compact ? 'compact' : ''}`} aria-label={`تصویر نمایشی ${product.name}`}>
      <span className="art-index">0{product.id}</span>
      <div className={`art-object art-${product.art}`}>
        <span>{label}</span>
      </div>
      <span className="art-caption">INDUST / {product.en.split(' ')[0]}</span>
    </div>
  )
}

function formatPrice(value) {
  return `${new Intl.NumberFormat('fa-IR').format(value)} تومان`
}

function App() {
  const [activeCategory, setActiveCategory] = useState('همه')
  const [cartOpen, setCartOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [favorites, setFavorites] = useState([])
  const [toast, setToast] = useState('')
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('indust-cart')) || {} } catch { return {} }
  })

  useEffect(() => { localStorage.setItem('indust-cart', JSON.stringify(cart)) }, [cart])
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 2400)
    return () => clearTimeout(timer)
  }, [toast])

  const filtered = activeCategory === 'همه' ? products : products.filter((p) => p.category === activeCategory)
  const cartItems = useMemo(() => products.filter((p) => cart[p.id]).map((p) => ({ ...p, qty: cart[p.id] })), [cart])
  const cartCount = cartItems.reduce((sum, item) => sum + item.qty, 0)
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0)

  const addToCart = (product) => {
    setCart((prev) => ({ ...prev, [product.id]: (prev[product.id] || 0) + 1 }))
    setToast(`${product.name} به سبد اضافه شد`)
  }
  const changeQty = (id, delta) => setCart((prev) => {
    const next = (prev[id] || 0) + delta
    if (next <= 0) { const copy = { ...prev }; delete copy[id]; return copy }
    return { ...prev, [id]: next }
  })
  const toggleFavorite = (id) => setFavorites((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id])
  const scrollToProducts = () => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="اینداست مرچ، صفحه اصلی">
          <span className="brand-mark"><i /><i /><i /></span>
          <span><b>INDUST</b><small>MERCH / EST. 2026</small></span>
        </a>
        <nav className={mobileOpen ? 'nav-links open' : 'nav-links'} aria-label="ناوبری اصلی">
          <a href="#products" onClick={() => setMobileOpen(false)}>فروشگاه</a>
          <a href="#story" onClick={() => setMobileOpen(false)}>داستان ما</a>
          <a href="#footer" onClick={() => setMobileOpen(false)}>ارتباط</a>
        </nav>
        <div className="header-actions">
          <button className="icon-btn mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} aria-label="نمایش منو"><Icon name={mobileOpen ? 'close' : 'menu'} /></button>
          <button className="cart-button" onClick={() => setCartOpen(true)} aria-label={`سبد خرید، ${cartCount} کالا`}>
            <Icon name="bag" /><span>سبد</span>{cartCount > 0 && <b>{new Intl.NumberFormat('fa-IR').format(cartCount)}</b>}
          </button>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-copy">
            <div className="eyebrow"><span>●</span> برای مهندس‌هایی که فقط عدد نیستند</div>
            <h1>فرمولت رو<br /><em>بپوش.</em></h1>
            <p>مرچ مستقل برای زندگیِ بین کلاس، کافه و ددلاین. طراحی‌شده از دل مهندسی صنایع؛ برای آدم‌هایی که بهینه فکر می‌کنند و متفاوت می‌پوشند.</p>
            <div className="hero-actions">
              <button className="primary-btn" onClick={scrollToProducts}>دیدن کالکشن <Icon name="arrow" size={19} /></button>
              <a className="text-link" href="#story">ماجرا از کجا شروع شد؟</a>
            </div>
            <div className="hero-note"><span>نسخه آزمایشی</span><span>پرداخت غیرفعال</span><span>ارسال سراسری در آینده</span></div>
          </div>

          <div className="hero-visual" aria-label="نمایش مفهومی کالکشن اینداست مرچ">
            <div className="orbit orbit-one" /><div className="orbit orbit-two" />
            <div className="hero-card">
              <span className="serial">IND—001 / CORE</span>
              <div className="hero-shirt"><strong>∑</strong><small>OPTIMIZE<br />EVERYTHING*</small></div>
              <div className="hero-card-foot"><span>ENGINEERED<br />FOR CAMPUS</span><b>01</b></div>
            </div>
            <span className="sticker sticker-a">LIMITED<br />DROP</span>
            <span className="sticker sticker-b">IE<br />CLUB</span>
          </div>
        </section>

        <section className="marquee" aria-label="ویژگی‌ها">
          <div>طراحی دانشجویی <span>✦</span> تولید محدود <span>✦</span> ایده‌های مهندسی <span>✦</span> مستقل و بی‌تکلف <span>✦</span> طراحی دانشجویی <span>✦</span> تولید محدود</div>
        </section>

        <section className="products-section" id="products">
          <div className="section-heading">
            <div><span className="section-kicker">DROP / 01</span><h2>محصولات این ترم</h2></div>
            <p>اولین کالکشن آزمایشی، الهام‌گرفته از شب‌های پروژه، نمودارها و شوخی‌هایی که فقط خودمان می‌فهمیم.</p>
          </div>
          <div className="category-row" role="tablist" aria-label="دسته‌بندی محصولات">
            {categories.map((category) => <button key={category} className={activeCategory === category ? 'active' : ''} onClick={() => setActiveCategory(category)}>{category}</button>)}
          </div>

          <div className="product-grid">
            {filtered.map((product) => (
              <article className="product-card" key={product.id}>
                <div className="product-media">
                  {product.label && <span className="product-label">{product.label}</span>}
                  <button className={`heart-btn ${favorites.includes(product.id) ? 'active' : ''}`} onClick={() => toggleFavorite(product.id)} aria-label="افزودن به علاقه‌مندی‌ها"><Icon name="heart" size={19} filled={favorites.includes(product.id)} /></button>
                  <ProductArtwork product={product} />
                  <button className="quick-add" onClick={() => addToCart(product)}><Icon name="plus" size={19} /> افزودن سریع</button>
                </div>
                <div className="product-info">
                  <div><h3>{product.name}</h3><span>{product.color}</span></div>
                  <strong>{formatPrice(product.price)}</strong>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="story-section" id="story">
          <div className="story-number">01—∞</div>
          <div className="story-copy">
            <span className="section-kicker">از صنایع، برای همه دانشگاه</span>
            <h2>یک برند کوچک<br />با نقشه‌ای بزرگ.</h2>
            <p>Indust Merch از یک سؤال ساده شروع شد: چرا مرچ دانشگاهی نباید چیزی باشد که واقعاً دلمان بخواهد بپوشیم؟ فعلاً از دانشکده مهندسی صنایع آغاز می‌کنیم؛ با طراحی‌های مستقل، شوخ‌طبع و کاربردی. قدم بعدی، ساخت کالکشن‌های اختصاصی برای بقیه دانشکده‌هاست.</p>
            <div className="story-points">
              <span><b>01</b> مستقل و دانشجویی</span>
              <span><b>02</b> بدون استفاده از نشان رسمی</span>
              <span><b>03</b> آماده گسترش</span>
            </div>
          </div>
          <div className="story-poster">
            <span>THE<br />SYSTEM<br />IS <i>YOU.</i></span>
            <small>INDUSTRIAL ENGINEERING / CAMPUS CULTURE</small>
          </div>
        </section>

        <section className="newsletter">
          <div><span className="section-kicker">DROP ALERT</span><h2>قبل از همه باخبر شو.</h2><p>برای خبر کالکشن‌های بعدی ایمیلت را بگذار. فعلاً نمایشی است؛ قول اسپم نمی‌دهیم، چون هنوز چیزی ارسال نمی‌کنیم!</p></div>
          <form onSubmit={(e) => { e.preventDefault(); setToast('عضویت نمایشی ثبت شد؛ به‌زودی واقعی می‌شویم!'); e.currentTarget.reset() }}>
            <input type="email" required placeholder="ایمیل دانشگاهی یا شخصی" aria-label="ایمیل" />
            <button type="submit">عضویت <Icon name="arrow" size={19} /></button>
          </form>
        </section>
      </main>

      <footer id="footer">
        <div className="footer-brand"><span className="brand-mark"><i /><i /><i /></span><b>INDUST<br />MERCH</b></div>
        <p>یک پروژه مستقل دانشجویی؛ غیررسمی و بدون وابستگی سازمانی به دانشگاه صنعتی امیرکبیر.</p>
        <div className="footer-links"><a href="#products">فروشگاه</a><a href="#story">درباره</a><a href="mailto:hello@industmerch.ir">تماس</a></div>
        <small>© ۲۰۲۶ — ساخته‌شده با قهوه، ددلاین و کمی بهینه‌سازی.</small>
      </footer>

      {cartOpen && <div className="drawer-backdrop" onClick={() => setCartOpen(false)} />}
      <aside className={`cart-drawer ${cartOpen ? 'open' : ''}`} aria-hidden={!cartOpen} aria-label="سبد خرید">
        <div className="drawer-header"><div><span className="section-kicker">YOUR CART</span><h2>سبد خرید <b>{new Intl.NumberFormat('fa-IR').format(cartCount)}</b></h2></div><button className="icon-btn" onClick={() => setCartOpen(false)} aria-label="بستن"><Icon name="close" /></button></div>
        <div className="cart-content">
          {cartItems.length === 0 ? <div className="empty-cart"><div><Icon name="bag" size={36} /></div><h3>سبدت هنوز خالیه</h3><p>کالکشن را ببین و یک تکه از حال‌وهوای دانشکده را بردار.</p><button className="primary-btn" onClick={() => { setCartOpen(false); scrollToProducts() }}>دیدن محصولات</button></div> : cartItems.map((item) => <div className="cart-item" key={item.id}>
            <ProductArtwork product={item} compact />
            <div className="cart-item-info"><h3>{item.name}</h3><span>{formatPrice(item.price)}</span><div className="qty-control"><button onClick={() => changeQty(item.id, -1)} aria-label="کم کردن"><Icon name="minus" size={16} /></button><b>{new Intl.NumberFormat('fa-IR').format(item.qty)}</b><button onClick={() => changeQty(item.id, 1)} aria-label="زیاد کردن"><Icon name="plus" size={16} /></button></div></div>
            <button className="remove-btn" onClick={() => setCart((prev) => { const copy = { ...prev }; delete copy[item.id]; return copy })} aria-label="حذف"><Icon name="trash" size={18} /></button>
          </div>)}
        </div>
        {cartItems.length > 0 && <div className="cart-footer"><div><span>جمع سبد</span><strong>{formatPrice(subtotal)}</strong></div><button onClick={() => setToast('پرداخت در نسخه آزمایشی غیرفعال است')} className="checkout-btn">ادامه و پرداخت <Icon name="arrow" size={19} /></button><small>این فروشگاه در مرحله نمونه اولیه است و پرداخت واقعی انجام نمی‌شود.</small></div>}
      </aside>

      <div className={`toast ${toast ? 'show' : ''}`} role="status"><Icon name="check" size={19} />{toast}</div>
    </div>
  )
}

export default App
