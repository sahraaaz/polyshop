'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import type { CatalogProduct } from '../../lib/catalog'

type ProductDraft = Omit<CatalogProduct, 'source'>
const emptyProduct = (): ProductDraft => ({ id: '', title: '', subtitle: '', category: '', price: 0, stock: 0, color: '', blurb: '', status: 'pending', discount: 0, image: '/products/poly-tee.jpg' })
const messages: Record<string, string> = {
  invalid_credentials: 'رمز ورود درست نیست.', unauthorized: 'نشست منقضی شده؛ دوباره وارد شو.',
  forbidden: 'درخواست از آدرس مجاز مدیریت ارسال نشده است.', too_many_attempts: 'تعداد تلاش‌ها زیاد شده؛ ۱۵ دقیقه بعد دوباره امتحان کن.',
  service_unavailable: 'سرویس مدیریت در دسترس نیست یا هنوز تنظیم نشده است.', invalid_product: 'اطلاعات محصول معتبر نیست؛ فیلدها را بررسی کن.',
  product_exists: 'شناسهٔ محصول قبلاً ثبت شده است.', product_not_found: 'محصول پیدا نشد.', invalid_request: 'درخواست معتبر نیست.',
}
const statusLabels: Record<string, string> = { approved: 'منتشرشده', pending: 'پیش‌نویس', archived: 'آرشیو' }

export default function AdminPanel() {
  const [ready, setReady] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [draft, setDraft] = useState<ProductDraft | null>(null)
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function api(path: string, options?: RequestInit) {
    const response = await fetch(`/api/admin/${path}`, { ...options, credentials: 'same-origin', cache: 'no-store' })
    const body = await response.json()
    if (!response.ok) {
      if (response.status === 401) { setAuthenticated(false); setProducts([]); setDraft(null) }
      throw new Error(messages[body.error] || 'انجام درخواست ممکن نشد.')
    }
    return body
  }
  async function loadProducts() {
    const result = await api('products')
    setProducts(result.products)
  }
  useEffect(() => {
    let alive = true
    fetch('/api/admin/session', { credentials: 'same-origin', cache: 'no-store' }).then(async response => {
      if (!alive) return
      if (response.ok) {
        const listing = await fetch('/api/admin/products', { credentials: 'same-origin', cache: 'no-store' })
        if (!alive) return
        if (listing.ok) { setProducts((await listing.json()).products); setAuthenticated(true) }
        else if (listing.status !== 401) setMessage(messages.service_unavailable)
      } else if (response.status !== 401) setMessage(messages.service_unavailable)
    }).catch(() => { if (alive) setMessage(messages.service_unavailable) }).finally(() => { if (alive) setReady(true) })
    return () => { alive = false }
  }, [])

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('')
    try {
      await api('login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
      setAuthenticated(true); await loadProducts()
    } catch (error) { setMessage(error instanceof Error ? error.message : messages.service_unavailable) }
    finally { setPassword(''); setBusy(false) }
  }
  async function logout() {
    setBusy(true); setMessage('')
    try {
      await api('logout', { method: 'POST' })
      setAuthenticated(false); setProducts([]); setDraft(null)
    } catch (error) { setMessage(error instanceof Error ? error.message : messages.service_unavailable) }
    finally { setBusy(false) }
  }
  function edit(product: CatalogProduct) {
    const { source: _source, ...value } = product
    setDraft(value); setCreating(false); setMessage('')
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft) return
    setBusy(true); setMessage('')
    const { id, ...changes } = draft
    try {
      await api(creating ? 'products' : `products/${encodeURIComponent(id)}`, {
        method: creating ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(creating ? draft : changes),
      })
      setDraft(null); await loadProducts(); setMessage('محصول ذخیره شد.')
    } catch (error) { setMessage(error instanceof Error ? error.message : messages.service_unavailable) }
    finally { setBusy(false) }
  }
  function change(key: keyof ProductDraft, value: string | number) {
    setDraft(current => current ? { ...current, [key]: value } : current)
  }

  return <main className="admin-shell">
    <header><div><span className="section-tag">POLYSHOP</span><h1>مدیریت محصولات</h1></div><Link href="/">بازگشت به سایت</Link>{authenticated && <button disabled={busy} onClick={logout}>خروج</button>}</header>
    <p role="status" aria-live="polite">{message}</p>
    {!ready ? <p>در حال بررسی ورود…</p> : !authenticated ? <form className="admin-login" onSubmit={login}>
      <h2>ورود مدیر</h2><label htmlFor="admin-password">رمز ورود</label><input id="admin-password" type="password" autoComplete="current-password" maxLength={256} required value={password} onChange={event => setPassword(event.target.value)} />
      <button disabled={busy} type="submit">{busy ? 'در حال ورود…' : 'ورود'}</button>
    </form> : <>
      <button disabled={busy} onClick={() => { setDraft(emptyProduct()); setCreating(true); setMessage('') }}>افزودن محصول</button>
      <div className="admin-table-wrap"><table><thead><tr><th>محصول</th><th>قیمت (تومان)</th><th>موجودی</th><th>انتشار</th><th>عملیات</th></tr></thead><tbody>{products.map(product => <tr key={product.id}><td>{product.title}</td><td>{product.price.toLocaleString('fa-IR')}</td><td>{product.stock.toLocaleString('fa-IR')}</td><td>{statusLabels[product.status] || product.status}</td><td><button disabled={busy} onClick={() => edit(product)}>ویرایش</button></td></tr>)}</tbody></table></div>
      {draft && <form className="admin-editor" onSubmit={save}><h2>{creating ? 'محصول جدید' : 'ویرایش محصول'}</h2><fieldset disabled={busy}>
        <label>شناسهٔ انگلیسی<input dir="ltr" required pattern="[a-z0-9][a-z0-9-]{0,99}" maxLength={100} disabled={!creating} value={draft.id} onChange={event => change('id', event.target.value)} /></label>
        {([['title', 'عنوان'], ['subtitle', 'عنوان انگلیسی'], ['category', 'دسته‌بندی'], ['color', 'رنگ']] as const).map(([key, label]) => <label key={key}>{label}<input required={key === 'title'} maxLength={10000} value={draft[key]} onChange={event => change(key, event.target.value)} /></label>)}
        {([['price', 'قیمت به تومان', undefined], ['stock', 'موجودی', undefined], ['discount', 'تخفیف درصدی', 100]] as const).map(([key, label, max]) => <label key={key}>{label}<input type="number" min={0} max={max} step={1} required value={Number.isFinite(draft[key]) ? draft[key] : ''} onChange={event => change(key, event.target.value === '' ? NaN : Number(event.target.value))} /></label>)}
        <label>وضعیت<select value={draft.status} onChange={event => change('status', event.target.value)}><option value="pending">پیش‌نویس</option><option value="approved">منتشرشده</option><option value="archived">آرشیو</option></select></label>
        <label>مسیر عکس موجود<input dir="ltr" required pattern="/products/[a-zA-Z0-9-]+\.jpg" value={draft.image} onChange={event => change('image', event.target.value)} /><small>یکی از عکس‌های موجود در پوشهٔ products، مثل /products/poly-tee.jpg</small></label>
        <label className="admin-wide">توضیحات<textarea maxLength={10000} value={draft.blurb} onChange={event => change('blurb', event.target.value)} /></label>
        <div className="admin-wide"><button type="submit">{busy ? 'در حال ذخیره…' : 'ذخیرهٔ محصول'}</button><button type="button" onClick={() => setDraft(null)}>انصراف</button></div>
      </fieldset></form>}
    </>}
  </main>
}
