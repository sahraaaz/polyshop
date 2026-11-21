import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { isAbsolute, join, resolve } from 'node:path'
import { openCatalogStore } from './catalog-store.mjs'
import { createCatalogHandlers } from './catalog-http.mjs'
import { catalogDatabasePath, getCatalogStore } from './catalog-service.mjs'
import { catalogSeed } from '../src/data/catalog-seed.js'
import { findProduct, listPublicProducts } from '../src/lib/catalog.ts'

test('public API reflects database changes and hides archived products immediately', async () => {
  const store = openCatalogStore({ filename: ':memory:', seed: catalogSeed })
  const handlers = createCatalogHandlers(() => store)
  try {
    const list = handlers.list()
    assert.equal(list.status, 200)
    assert.equal(list.headers.get('cache-control'), 'no-store')
    const { products } = await list.json()
    assert.equal(products.length, 9)
    const original = products[0]
    store.updateProduct({ ...original, price: 123000, stock: 0 })
    const detail = await handlers.detail(original.id).json()
    assert.equal(detail.product.price, 123000)
    assert.equal(detail.product.stock, 0)
    store.updateProduct({ ...original, status: 'archived' })
    assert.equal(handlers.detail(original.id).status, 404)
    assert.equal((await handlers.list().json()).products.length, 8)
  } finally { store.close() }
})

test('missing and malformed product identifiers return the same public 404', async () => {
  const store = openCatalogStore({ filename: ':memory:', seed: catalogSeed })
  const handlers = createCatalogHandlers(() => store)
  try {
    for (const id of ['missing', '../private', "' OR 1=1 --", '', undefined, 'a'.repeat(101)]) {
      const response = handlers.detail(id)
      assert.equal(response.status, 404)
      assert.deepEqual(await response.json(), { error: 'product_not_found' })
    }
  } finally { store.close() }
})

test('database initialization failures return retryable errors without internal details', async () => {
  const handlers = createCatalogHandlers(() => { throw new Error('secret-path/database.sqlite SQL failure') })
  for (const response of [handlers.list(), handlers.detail('tee-campus')]) {
    assert.equal(response.status, 503)
    assert.equal(response.headers.get('retry-after'), '30')
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.deepEqual(await response.json(), { error: 'catalog_unavailable' })
  }
})

test('database query failures also return sanitized 503 responses', async () => {
  const handlers = createCatalogHandlers(() => ({
    listPublicProducts() { throw new Error('SQL error') },
    getPublicProduct() { throw new Error('SQL error') },
  }))
  assert.equal(handlers.list().status, 503)
  assert.equal(handlers.detail('tee-campus').status, 503)
})

test('database paths cannot be placed in static assets or build output', () => {
  const root = resolve('example-app')
  for (const directory of ['public', 'dist', 'out', '.next']) {
    assert.throws(() => catalogDatabasePath(root, join(directory, 'db.sqlite')), /outside/)
    assert.throws(() => catalogDatabasePath(root, resolve(root, directory, 'db.sqlite')), /outside/)
  }
  assert.ok(isAbsolute(catalogDatabasePath(root, 'data/db.sqlite')))
  assert.equal(catalogDatabasePath(root, 'public-backup/db.sqlite'), resolve(root, 'public-backup/db.sqlite'))
})

test('server singleton seeds the real official catalog and reuses its connection', () => {
  const directory = mkdtempSync(join(tmpdir(), 'polymoly-service-'))
  const previous = process.env.POLYMOLY_DATABASE_FILE
  process.env.POLYMOLY_DATABASE_FILE = join(directory, 'catalog.sqlite')
  let store
  try {
    store = getCatalogStore()
    assert.equal(store, getCatalogStore())
    assert.equal(store.listPublicProducts().length, 9)
    const product = store.listPublicProducts()[0]
    store.updateProduct({ ...product, stock: 1 })
    assert.equal(getCatalogStore().getPublicProduct(product.id).stock, 1)
    assert.equal(listPublicProducts().length, 9)
    assert.equal(findProduct(product.id).stock, 1)
    assert.equal(findProduct('missing'), null)
    store.updateProduct({ ...product, status: 'archived' })
    assert.equal(findProduct(product.id), null)
    assert.equal(listPublicProducts().length, 8)
    process.env.POLYMOLY_DATABASE_FILE = join(directory, 'other.sqlite')
    assert.throws(() => getCatalogStore(), /Restart/)
  } finally {
    store?.close()
    delete globalThis[Symbol.for('polymoly.catalog-store.v1')]
    if (previous === undefined) delete process.env.POLYMOLY_DATABASE_FILE
    else process.env.POLYMOLY_DATABASE_FILE = previous
    rmSync(directory, { recursive: true, force: true })
  }
})
