import type { Metadata } from 'next'
import Link from 'next/link'
import { listPublicProducts } from '../../lib/catalog'
import CheckoutPanel from './panel'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'رزرو سفارش', robots: { index: false, follow: false } }
export default function CheckoutPage() {
  const enabled = process.env.CHECKOUT_ENABLED === 'true'
  return <main className="catalog-shell"><Link href="/">بازگشت به Polyshop</Link><h1>رزرو سفارش</h1>
    <p>این مرحله فقط رزرو کالا است؛ پرداخت، اطلاعات ارسال و نهایی‌کردن خرید هنوز فعال نیست.</p>
    {enabled ? <CheckoutPanel products={listPublicProducts()} /> : <p role="status">ثبت سفارش آنلاین هنوز باز نشده است.</p>}
  </main>
}
