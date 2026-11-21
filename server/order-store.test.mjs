import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Worker } from 'node:worker_threads'
import { openCatalogStore } from './catalog-store.mjs'
import { OrderInputError, OrderConflictError, RESERVATION_MS } from './order-store.mjs'
import { catalogSeed } from '../src/data/catalog-seed.js'

const product = { ...catalogSeed[0], price: 101, discount: 50, stock: 5 }
const owner = 'private-owner-session-0001'
const cart = (items = [{ productId: product.id, quantity: 2 }], key = 'checkout-key-0001', ownerKey = owner) => ({ items, idempotencyKey: key, ownerKey })
function setup(seed = [product]) {
  let clock = 1000
  const store = openCatalogStore({ filename: ':memory:', seed, now: () => clock })
  return { store, setClock: value => { clock = value } }
}

test('reservation calculates discounted prices on the server and snapshots them', () => {
  const { store } = setup()
  try {
    const order = store.reserveOrder(cart())
    assert.equal(order.total, 102)
    assert.equal(order.currency, 'TMN')
    assert.equal(order.items[0].unitPrice, 51)
    assert.equal(order.status, 'pending_payment')
    assert.equal(store.getPublicProduct(product.id).stock, 3)
    store.updateProduct({ ...product, price: 500, stock: 3 })
    assert.equal(store.getOwnedOrder(order.id, owner).total, 102)
    assert.equal(store.getOwnedOrder(order.id, 'other-owner-session-0002'), null)
    assert.ok(!JSON.stringify(order).includes(owner))
  } finally { store.close() }
})

test('retrying the same cart is idempotent, but a changed cart conflicts', () => {
  const { store } = setup()
  try {
    const first = store.reserveOrder(cart())
    assert.deepEqual(store.reserveOrder(cart()), first)
    assert.equal(store.getPublicProduct(product.id).stock, 3)
    assert.throws(() => store.reserveOrder(cart([{ productId: product.id, quantity: 1 }])), OrderConflictError)
    assert.equal(store.getPublicProduct(product.id).stock, 3)
    assert.equal(store.listAdminOrders().length, 1)
  } finally { store.close() }
})

test('cart ordering does not change idempotency and keys are scoped to their owner', () => {
  const second = { ...product, id: 'second-product' }
  const { store } = setup([product, second])
  try {
    const items = [{ productId: product.id, quantity: 1 }, { productId: second.id, quantity: 1 }]
    const first = store.reserveOrder(cart(items))
    assert.equal(store.reserveOrder(cart([...items].reverse())).id, first.id)
    assert.notEqual(store.reserveOrder(cart(items, 'checkout-key-0001', 'different-owner-00002')).id, first.id)
  } finally { store.close() }
})

test('unavailable or unapproved lines roll back the entire reservation', () => {
  const hidden = { ...product, id: 'zz-hidden', status: 'pending' }
  const { store } = setup([product, hidden])
  try {
    for (const id of ['zz-hidden', 'zz-missing']) {
      assert.throws(() => store.reserveOrder(cart([{ productId: product.id, quantity: 1 }, { productId: id, quantity: 1 }])), OrderConflictError)
      assert.equal(store.getPublicProduct(product.id).stock, 5)
      assert.equal(store.listAdminOrders().length, 0)
    }
    assert.throws(() => store.reserveOrder(cart([{ productId: product.id, quantity: 6 }])), OrderConflictError)
  } finally { store.close() }
})

test('client price injection, invalid quantities, duplicate lines and excessive amounts are rejected', () => {
  const { store } = setup()
  try {
    for (const input of [
      { ...cart(), total: 1 }, cart([{ productId: product.id, quantity: 1, price: 1 }]),
      cart([]), cart([{ productId: product.id, quantity: 0 }]), cart([{ productId: product.id, quantity: 1.5 }]),
      cart([{ productId: product.id, quantity: 21 }]), cart([{ productId: product.id, quantity: 1 }, { productId: product.id, quantity: 1 }]),
    ]) assert.throws(() => store.reserveOrder(input), OrderInputError)
    assert.equal(store.getPublicProduct(product.id).stock, 5)
    store.updateProduct({ ...product, price: Number.MAX_SAFE_INTEGER, discount: 0 })
    assert.throws(() => store.reserveOrder(cart()), OrderInputError)
    assert.equal(store.getPublicProduct(product.id).stock, 5)
  } finally { store.close() }
})

test('cancellation restores stock exactly once and records the transition', () => {
  const { store } = setup()
  try {
    const order = store.reserveOrder(cart())
    assert.equal(store.cancelAdminOrder(order.id).status, 'cancelled')
    assert.equal(store.cancelAdminOrder(order.id).status, 'cancelled')
    assert.equal(store.getPublicProduct(product.id).stock, 5)
    assert.deepEqual(store.listOrderEvents(order.id).map(event => event.action), ['reserved', 'cancelled'])
    assert.equal(store.reserveOrder(cart()).id, order.id)
    assert.equal(store.getPublicProduct(product.id).stock, 5)
  } finally { store.close() }
})

test('expired orders release on the next catalog read and cannot revive through retry', () => {
  const { store, setClock } = setup()
  try {
    const order = store.reserveOrder(cart())
    setClock(1000 + RESERVATION_MS)
    assert.equal(store.getPublicProduct(product.id).stock, 5)
    assert.equal(store.getOwnedOrder(order.id, owner).status, 'expired')
    assert.equal(store.expireReservations(), 0)
    assert.equal(store.reserveOrder(cart()).status, 'expired')
    assert.equal(store.cancelAdminOrder(order.id).status, 'expired')
    assert.deepEqual(store.listOrderEvents(order.id).map(event => event.action), ['reserved', 'expired'])
  } finally { store.close() }
})

test('reservations survive database restart and product edits cannot overflow released stock', () => {
  const directory = mkdtempSync(join(tmpdir(), 'polymoly-orders-'))
  const filename = join(directory, 'catalog.sqlite')
  let store
  try {
    store = openCatalogStore({ filename, seed: [product], now: () => 1000 })
    const order = store.reserveOrder(cart())
    assert.throws(() => store.updateProduct({ ...product, stock: Number.MAX_SAFE_INTEGER }))
    store.close(); store = openCatalogStore({ filename, seed: [product], now: () => 1001 })
    assert.equal(store.getPublicProduct(product.id).stock, 3)
    assert.equal(store.getOwnedOrder(order.id, owner).total, 102)
    store.cancelAdminOrder(order.id)
    assert.equal(store.getPublicProduct(product.id).stock, 5)
  } finally { store?.close(); rmSync(directory, { recursive: true, force: true }) }
})

test('two concurrent database connections cannot reserve the same last unit', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'polymoly-race-'))
  const filename = join(directory, 'catalog.sqlite')
  const store = openCatalogStore({ filename, seed: [{ ...product, stock: 1 }], now: () => 1000 })
  const workers = []
  const barrier = new SharedArrayBuffer(4)
  try {
    const results = await Promise.all([1, 2].map(index => new Promise((resolve, reject) => {
      const worker = new Worker(`
        const { parentPort, workerData } = require('node:worker_threads');
        (async () => {
          const { openCatalogStore } = await import(workerData.module);
          const store = openCatalogStore({ filename: workerData.filename, now: () => 1000 });
          const gate = new Int32Array(workerData.barrier); Atomics.add(gate, 0, 1); Atomics.notify(gate, 0);
          while (Atomics.load(gate, 0) < 2) Atomics.wait(gate, 0, 1, 5000);
          let result;
          try { result = { id: store.reserveOrder(workerData.cart).id }; }
          catch (error) { result = { error: error.constructor.name }; }
          store.close(); parentPort.postMessage(result);
        })().catch(error => { throw error });
      `, { eval: true, workerData: { module: new URL('./catalog-store.mjs', import.meta.url).href, filename, barrier, cart: cart([{ productId: product.id, quantity: 1 }], `race-checkout-000${index}`) } })
      workers.push(worker); worker.once('message', resolve); worker.once('error', reject)
    })))
    assert.equal(results.filter(result => result.id).length, 1)
    assert.equal(results.filter(result => result.error === 'OrderConflictError').length, 1)
    assert.equal(store.getPublicProduct(product.id).stock, 0)
  } finally {
    await Promise.all(workers.map(worker => worker.terminate()))
    store.close(); rmSync(directory, { recursive: true, force: true })
  }
})

test('inventory compare-and-set is checked inside the product write transaction', () => {
  const { store } = setup()
  try {
    const original = store.getAdminProduct(product.id)
    store.reserveOrder(cart())
    assert.throws(() => store.updateProduct({ ...original, title: 'Changed' }, original.stock), /Inventory changed/)
    assert.equal(store.getPublicProduct(product.id).stock, 3)
    assert.equal(store.getPublicProduct(product.id).title, product.title)
    assert.equal(store.listAudit().length, 0)
  } finally { store.close() }
})
