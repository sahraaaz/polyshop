import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { openCatalogStore } from './catalog-store.mjs'

const product = {
  id: 'tee-campus', title: 'Campus tee', subtitle: 'AUT', category: 'Clothing',
  price: 790000, stock: 14, color: 'White', blurb: 'Campus merchandise',
  source: 'official', status: 'approved', discount: 0, image: '/products/poly-tee.jpg',
}

test('catalog filters unapproved products and uses parameterized lookup', () => {
  const store = openCatalogStore({ filename: ':memory:', seed: [product, { ...product, id: 'hidden', status: 'pending' }] })
  try {
    assert.deepEqual(store.listPublicProducts(), [product])
    assert.deepEqual(store.getPublicProduct(product.id), product)
    assert.equal(store.getPublicProduct('hidden'), null)
    assert.equal(store.getPublicProduct("' OR 1=1 --"), null)
    assert.equal(store.getPublicProduct(undefined), null)
  } finally { store.close() }
})

test('restarting does not reset edited prices, stock or publication state', () => {
  const directory = mkdtempSync(join(tmpdir(), 'polymoly-catalog-'))
  const filename = join(directory, 'nested', 'catalog.sqlite')
  let store
  try {
    store = openCatalogStore({ filename, seed: [product] })
    store.updateProduct({ ...product, price: 900000, stock: 2 })
    store.close(); store = undefined
    store = openCatalogStore({ filename, seed: [product] })
    assert.equal(store.getPublicProduct(product.id).price, 900000)
    assert.equal(store.getPublicProduct(product.id).stock, 2)
    store.updateProduct({ ...product, status: 'archived' })
    store.close(); store = undefined
    store = openCatalogStore({ filename, seed: [product] })
    assert.equal(store.getPublicProduct(product.id), null)
  } finally {
    store?.close()
    rmSync(directory, { recursive: true, force: true })
  }
})

test('invalid product updates leave the stored record unchanged', () => {
  const store = openCatalogStore({ filename: ':memory:', seed: [product] })
  try {
    for (const change of [{ price: -1 }, { price: 1.5 }, { stock: -2 }, { stock: Infinity }, { discount: 101 }, { title: '' }, { source: 'student' }, { image: '/products/../../secret.jpg' }]) {
      assert.throws(() => store.updateProduct({ ...product, ...change }))
      assert.deepEqual(store.getPublicProduct(product.id), product)
    }
    assert.throws(() => store.updateProduct({ ...product, id: 'missing' }), /not found/)
  } finally { store.close() }
})

test('invalid seed batches do not partially modify an existing catalog', () => {
  const directory = mkdtempSync(join(tmpdir(), 'polymoly-catalog-'))
  const filename = join(directory, 'catalog.sqlite')
  try {
    const original = openCatalogStore({ filename, seed: [product] })
    original.close()
    assert.throws(() => openCatalogStore({ filename, seed: [{ ...product, id: 'new-valid' }, { ...product, id: 'invalid', stock: -1 }] }))
    const reopened = openCatalogStore({ filename })
    try { assert.deepEqual(reopened.listPublicProducts(), [product]) } finally { reopened.close() }
  } finally { rmSync(directory, { recursive: true, force: true }) }
})

test('future database schemas are rejected without downgrading them', () => {
  const directory = mkdtempSync(join(tmpdir(), 'polymoly-catalog-'))
  const filename = join(directory, 'catalog.sqlite')
  try {
    const db = new DatabaseSync(filename)
    db.exec('PRAGMA user_version = 2'); db.close()
    assert.throws(() => openCatalogStore({ filename }), /Unsupported/)
    const reopened = new DatabaseSync(filename)
    try { assert.equal(reopened.prepare('PRAGMA user_version').get().user_version, 2) } finally { reopened.close() }
  } finally { rmSync(directory, { recursive: true, force: true }) }
})
