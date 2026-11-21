'use client'

import { useEffect, useState } from 'react'
import type { OrderSummary } from '../../lib/orders'

const labels = { pending_payment: 'منتظر پرداخت', cancelled: 'لغوشده', expired: 'منقضی‌شده' }
const money = (value: number) => `${value.toLocaleString('fa-IR')} تومان`

export default function AdminOrders({ onInventoryChange }: { onInventoryChange: () => Promise<void> }) {
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  async function load() {
    const response = await fetch('/api/admin/orders', { cache: 'no-store', credentials: 'same-origin' })
    if (!response.ok) throw new Error(response.status === 401 ? 'نشست منقضی شده؛ دوباره وارد شو.' : 'دریافت سفارش‌ها ممکن نشد.')
    return (await response.json()).orders as OrderSummary[]
  }
  useEffect(() => {
    let alive = true
    load().then(rows => { if (alive) setOrders(rows) }).catch(cause => { if (alive) setError(cause.message) }).finally(() => { if (alive) setReady(true) })
    return () => { alive = false }
  }, [])
  async function refresh() {
    setBusy(true); setError('')
    try { setOrders(await load()); await onInventoryChange() } catch (cause) { setError(cause instanceof Error ? cause.message : 'دریافت سفارش‌ها ممکن نشد.') }
    finally { setBusy(false) }
  }
  async function cancel(id: string) {
    setBusy(true); setError('')
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(id)}/cancel`, { method: 'POST', credentials: 'same-origin' })
      if (!response.ok) throw new Error(response.status === 401 ? 'نشست منقضی شده؛ دوباره وارد شو.' : 'لغو سفارش ممکن نشد.')
      setConfirmation(''); setOrders(await load()); await onInventoryChange()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'لغو سفارش ممکن نشد.') }
    finally { setBusy(false) }
  }
  return <section className="admin-orders">
    <header><h2>سفارش‌ها و رزرو کالا</h2><button disabled={busy || !ready} onClick={refresh}>به‌روزرسانی</button></header>
    <p>۱۰۰ سفارش آخر. درگاه پرداخت و ثبت سفارش مشتری هنوز فعال نیست.</p>
    <p role="status" aria-live="polite">{error}</p>
    {!ready ? <p>در حال دریافت…</p> : !orders.length ? <p>سفارشی ثبت نشده است.</p> : <div className="admin-table-wrap"><table><thead><tr><th>شماره</th><th>کالاها</th><th>مبلغ</th><th>وضعیت</th><th>زمان پایان رزرو</th><th>عملیات</th></tr></thead><tbody>
      {orders.map(order => <tr key={order.id}><td dir="ltr" title={order.id}>{order.id.slice(0, 8)}</td><td>{order.items.map(item => <div key={item.productId}>{item.title} × {item.quantity.toLocaleString('fa-IR')}</div>)}</td><td>{money(order.total)}</td><td>{labels[order.status]}</td><td>{new Date(order.expiresAt).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' })}</td><td>{order.status === 'pending_payment' && (confirmation === order.id ? <><span>کالا آزاد شود؟</span><button disabled={busy} onClick={() => cancel(order.id)}>تأیید لغو</button><button disabled={busy} onClick={() => setConfirmation('')}>انصراف</button></> : <button disabled={busy} onClick={() => setConfirmation(order.id)}>لغو و آزادکردن کالا</button>)}</td></tr>)}
    </tbody></table></div>}
  </section>
}
