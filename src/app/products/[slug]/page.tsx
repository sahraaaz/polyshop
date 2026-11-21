import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { findProduct } from '../../../lib/catalog'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = findProduct(slug)
  if (!product) notFound()
  return {
    title: product.title,
    description: product.blurb,
    alternates: { canonical: `/products/${product.id}` },
    openGraph: { title: product.title, description: product.blurb, images: [product.image] },
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const product = findProduct(slug)
  if (!product) notFound()
  const price = Math.round(product.price * (1 - product.discount / 100))
  return <main className="catalog-shell">
    <Link className="catalog-back" href="/">← بازگشت به Polyshop</Link>
    <article className="catalog-detail">
      {/* Existing local photography is kept unchanged during migration. */}
      <img src={product.image} alt={product.title} width={800} height={800} />
      <div>
        <span className="section-tag">POLYSHOP</span>
        <h1>{product.title}</h1>
        <p dir="ltr">{product.subtitle}</p>
        <p>{product.blurb}</p>
        <dl><dt>دسته‌بندی</dt><dd>{product.category}</dd><dt>رنگ</dt><dd>{product.color}</dd></dl>
        <strong className="catalog-price">{new Intl.NumberFormat('fa-IR').format(price)} تومان</strong>
        <p className="catalog-notice">این محصول در مرحلهٔ پیش‌نمایش است. قیمت نهایی و امکان سفارش هنگام آغاز فروش اعلام می‌شود.</p>
        <Link className="catalog-back" href="/">مشاهدهٔ فروشگاه</Link>
      </div>
    </article>
  </main>
}
