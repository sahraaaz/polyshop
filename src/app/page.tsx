import Link from 'next/link'
import type { Metadata } from 'next'
import Storefront from './storefront'
import { listPublicProducts } from '../lib/catalog'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { alternates: { canonical: '/' } }

export default function Home() {
  const publicProducts = listPublicProducts()
  return <>
    <Storefront />
    <nav className="catalog-links" aria-label="صفحه‌های محصولات Polyshop">
      <h2>محصولات Polyshop</h2>
      <p>پیش‌نمایش محصولات؛ فروش آنلاین هنوز فعال نشده است.</p>
      {publicProducts.map(product => <Link key={product.id} href={`/products/${product.id}`}>{product.title}</Link>)}
    </nav>
  </>
}
