import type { MetadataRoute } from 'next'
import { publicProducts } from '../lib/catalog'
import { isIndexable, siteUrl } from '../lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  if (!isIndexable) return []
  return [{ url: siteUrl }, ...publicProducts.map(product => ({ url: `${siteUrl}/products/${product.id}` }))]
}
