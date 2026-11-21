import { getCatalogStore } from '../../server/catalog-service.mjs'

export interface CatalogProduct {
  id: string
  title: string
  subtitle: string
  category: string
  price: number
  stock: number
  color: string
  blurb: string
  source: string
  status: string
  discount: number
  image: string
}

function toProduct(row: Record<string, unknown>): CatalogProduct {
  return {
    id: String(row.id), title: String(row.title), subtitle: String(row.subtitle),
    category: String(row.category), price: Number(row.price), stock: Number(row.stock),
    color: String(row.color), blurb: String(row.blurb), source: String(row.source),
    status: String(row.status), discount: Number(row.discount), image: String(row.image),
  }
}

export function listPublicProducts(): CatalogProduct[] {
  return getCatalogStore().listPublicProducts().map(toProduct)
}

export function findProduct(id: string): CatalogProduct | null {
  const row = getCatalogStore().getPublicProduct(id)
  return row ? toProduct(row) : null
}
