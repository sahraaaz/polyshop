import type { MetadataRoute } from 'next'
import { listPublicProducts } from '../lib/catalog'
import { isIndexable, siteUrl } from '../lib/site'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default function sitemap(): MetadataRoute.Sitemap {
  if (!isIndexable) return []
  return [{ url: siteUrl }, ...listPublicProducts().map(product => ({ url: `${siteUrl}/products/${product.id}` }))]
}
