'use client'
import { useEffect, useState } from 'react'
import type { CatalogProduct } from '../../lib/catalog'
import type { OrderSummary } from '../../lib/orders'

type Line = { productId: string; quantity: number }
const storageKey = 'polymoly-checkout-v1'
const errors: Record<string, string> = {
  checkout_unavailable: 'رزرو سفارش هنوز باز نشده است.', forbidden: 'از آدرس اصلی سایت وارد شو.',
  unauthorized: 'نشست مهمان منقضی شده؛ صفحه را دوباره باز کن.', invalid_cart: 'کالاها و تعداد را بررسی کن.',
  reservation_conflict: 'موجودی یا رزرو فعال تغییر کرده؛ رسید قبلی و تعداد کالاها را بررسی کن.',
  too_many_attempts: 'تعداد تلاش‌ها زیاد شده؛ ۱۵ دقیقه بعد دوباره امتحان کن.', order_not_found: 'این رزرو برای نشست فعلی پیدا نشد.',
}
async function api(path: string, options?: RequestInit) {
  const response = await fetch(`/api/checkout/${path}`, { ...options, credentials: 'same-origin', cache: 'no-store' })
  const body = await response.json()
  if (!response.ok) throw new Error(errors[body.error] || 'سرویس موقتاً در دسترس نیست.')
  return body
}
export default function CheckoutPanel({ products }: { products: CatalogProduct[] }) {
  const [items, setItems] = useState<Line[]>([])
  const [key, setKey] = useState('')
  const [order, setOrder] = useState<OrderSummary | null>(null)
  const [busy, setBusy] = useState(true)
  const [message, setMessage] = useState('')
  function remember(lines: Line[], requestKey: string, orderId?: string) {
    try { sessionStorage.setItem(storageKey, JSON.stringify({ items: lines, key: requestKey, orderId })) } catch {}
  }
  useEffect(() => {
    let alive = true
    async function initialize() {
      const fresh = crypto.randomUUID()
      let saved: { items?: Line[]; key?: string; orderId?: string } = {}
      try { saved = JSON.parse(sessionStorage.getItem(storageKey) || '{}') || {} } catch {}
      const lines = Array.isArray(saved.items) ? saved.items.filter(line => line && products.some(product => product.id === line.productId) && Number.isInteger(line.quantity) && line.quantity >= 1 && line.quantity <= 20).slice(0, 20) : []
      if (!alive) return
      const requestKey = typeof saved.key === 'string' && /^[a-zA-Z0-9_-]{16,100}$/.test(saved.key) ? saved.key : fresh
      setKey(requestKey); setItems(lines)
      await api('session', { method: 'POST' })
      const active = await api('orders/active')
      if (active.order) {
        if (alive) { setOrder(active.order); remember(lines, requestKey, active.order.id) }
      } else if (saved.orderId && /^[a-f0-9-]{36}$/.test(saved.orderId)) {
        const result = await api(`orders/${saved.orderId}`)
        if (alive) setOrder(result.order)
      }
    }
    initialize().catch(cause => { if (alive) setMessage(cause.message) }).finally(() => { if (alive) setBusy(false) })
    return () => { alive = false }
  }, [products])
  function changeCart(next: Line[]) {
    const requestKey = crypto.randomUUID()
    setItems(next); setKey(requestKey); remember(next, requestKey); setMessage('')
  }
  async function reserve() {
    setBusy(true); setMessage(''); remember(items, key)
    try {
      const result = await api('orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items, idempotencyKey: key }) })
      setOrder(result.order); remember(items, key, result.order.id)
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'رزرو انجام نشد.') }
    finally { setBusy(false) }
  }
  async function updateReceipt(cancel = false) {
    if (!order) return
    setBusy(true); setMessage('')
    try { setOrder((await api(`orders/${order.id}${cancel ? '/cancel' : ''}`, cancel ? { method: 'POST' } : undefined)).order) }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : 'دریافت رسید ممکن نشد.') }
    finally { setBusy(false) }
  }
  const ended = order && order.status !== 'pending_payment'
  return <section>
    <p role="status" aria-live="polite">{message}</p>
    {order ? <><h2>رسید رزرو</h2><p dir="ltr">{order.id}</p><p>{({ pending_payment: 'منتظر پرداخت', cancelled: 'لغوشده', expired: 'منقضی‌شده' })[order.status]}</p>
      <ul>{order.items.map(item => <li key={item.productId}>{item.title} × {item.quantity.toLocaleString('fa-IR')}</li>)}</ul>
      <p>مبلغ محاسبه‌شدهٔ سرور: {order.total.toLocaleString('fa-IR')} تومان</p><p>پایان رزرو: {new Date(order.expiresAt).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' })}</p>
      <button disabled={busy} onClick={() => updateReceipt()}>به‌روزرسانی رسید</button>{!ended && <button disabled={busy} onClick={() => updateReceipt(true)}>لغو رزرو و آزادکردن کالا</button>}
      {ended && <button disabled={busy} onClick={() => { setOrder(null); changeCart([]) }}>سبد جدید</button>}
    </> : <><div className="catalog-links">{products.map(product => <button key={product.id} disabled={busy || product.stock < 1 || items.some(line => line.productId === product.id)} onClick={() => changeCart([...items, { productId: product.id, quantity: 1 }])}>{product.title}</button>)}</div>
      <ul>{items.map(line => <li key={line.productId}>{products.find(product => product.id === line.productId)?.title} <label>تعداد <input type="number" min={1} max={20} value={line.quantity} disabled={busy} onChange={event => changeCart(items.map(item => item.productId === line.productId ? { ...item, quantity: Number(event.target.value) } : item))} /></label><button disabled={busy} onClick={() => changeCart(items.filter(item => item.productId !== line.productId))}>حذف</button></li>)}</ul>
      <button disabled={busy || !items.length || items.some(line => !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 20)} onClick={reserve}>رزرو ۱۵دقیقه‌ای کالاها</button>
    </>}
  </section>
}
