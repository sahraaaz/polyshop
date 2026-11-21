import { products } from './products.js'

const images = {
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

// Initial records only: reopening an existing database never resets these fields.
export const catalogSeed = products
  .filter(product => product.source === 'official' && product.status === 'approved')
  .map(product => ({ ...product, image: `/products/${images[product.id] || 'poly-accessories.jpg'}` }))
