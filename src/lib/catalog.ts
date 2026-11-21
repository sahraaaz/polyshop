import { products } from '../data/products'

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

const images: Record<string, string> = {
  'tee-amirkabir-1401': 'amirkabir-1401-product.jpg',
  'tee-engineer-pear': 'engineer-pear-shirt-v2.jpg',
  'tee-chaos': 'poly-tee.jpg',
  'tee-deadline': 'poly-tee.jpg',
  'hoodie-night': 'poly-hoodie.jpg',
  'pixel-ie': 'poly-accessories.jpg',
  'tote-campus': 'poly-accessories.jpg',
  'service-poster': 'poster-service.jpg',
  'service-cv': 'student-study.jpg',
}

// Deliberately excludes browser-local listings and unmoderated student products.
export const publicProducts: CatalogProduct[] = products
  .filter(product => product.source === 'official' && product.status === 'approved')
  .map(product => ({ ...product, image: `/products/${images[product.id] || 'poly-accessories.jpg'}` }))

export const findProduct = (id: string) => publicProducts.find(product => product.id === id)
