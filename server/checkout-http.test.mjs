import { test } from 'node:test'
import assert from 'node:assert/strict'
import { openCatalogStore } from './catalog-store.mjs'
import { createCheckoutHandlers } from './checkout-http.mjs'
import { catalogSeed } from '../src/data/catalog-seed.js'
import { GUEST_SECONDS } from './guest-store.mjs'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const origin = 'https://polymoly.ir'
const settings = { enabled: true, origin, secure: true, cookieName: '__Host-polymoly_guest' }
const cart = { items: [{ productId: catalogSeed[0].id, quantity: 1 }], idempotencyKey: 'checkout-test-key-0001' }
const request = (cookie = '', body, from = origin) => new Request(`${origin}/api/checkout/orders`, { method: 'POST', headers: { Origin: from, Cookie: cookie, 'Content-Type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) })
function setup() {
  let clock = 1000
  const store = openCatalogStore({ filename: ':memory:', seed: catalogSeed, now: () => clock })
  const handlers = createCheckoutHandlers({ getStore: () => store, config: () => settings })
  const session = () => handlers.session(request()).headers.get('set-cookie').split(';')[0]
  return { store, handlers, session, setClock: value => { clock = value }, close: () => store.close() }
}

test('checkout launch gate rejects every operation before database access', async () => {
  const handlers = createCheckoutHandlers({ getStore: () => { throw new Error('must not open') }, config: () => ({ ...settings, enabled: false }) })
  for (const response of [handlers.session(request()), await handlers.reserve(request('', cart)), handlers.active(request()), handlers.detail(request(), 'a'.repeat(36)), handlers.cancel(request(), 'a'.repeat(36))]) {
    assert.equal(response.status, 503)
    assert.deepEqual(await response.json(), { error: 'checkout_unavailable' })
  }
})
test('guest session is HTTP-only and secure, and refresh does not issue a new identity', async () => {
  const { handlers, close } = setup()
  try {
    const response = handlers.session(request())
    assert.deepEqual(await response.json(), { ready: true })
    const cookie = response.headers.get('set-cookie')
    for (const flag of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/']) assert.ok(cookie.includes(flag))
    assert.equal(handlers.session(request(cookie.split(';')[0])).headers.get('set-cookie'), null)
  } finally { close() }
})
test('checkout needs a server session and rejects cross-origin session/order creation', async () => {
  const { handlers, session, store, close } = setup()
  try {
    assert.equal((await handlers.reserve(request('', cart))).status, 401)
    assert.equal((await handlers.reserve(request('__Host-polymoly_guest=forged', cart))).status, 401)
    const cookie = session()
    assert.equal(handlers.session(request('', undefined, 'https://attacker.example')).status, 403)
    assert.equal((await handlers.reserve(request(cookie, cart, 'https://attacker.example'))).status, 403)
    assert.equal(store.listAdminOrders().length, 0)
  } finally { close() }
})
test('reservation is idempotent and a guest cannot create a second active hold', async () => {
  const { handlers, session, store, close } = setup()
  try {
    const cookie = session()
    const first = await handlers.reserve(request(cookie, cart))
    assert.equal(first.status, 200)
    const order = (await first.json()).order
    const retry = await handlers.reserve(request(cookie, cart))
    assert.equal((await retry.json()).order.id, order.id)
    assert.equal((await handlers.reserve(request(cookie, { ...cart, idempotencyKey: 'another-cart-key-0002' }))).status, 409)
    assert.equal(store.getPublicProduct(catalogSeed[0].id).stock, catalogSeed[0].stock - 1)
  } finally { close() }
})
test('another guest cannot view or cancel an order; its owner can cancel only once', async () => {
  const { handlers, session, store, close } = setup()
  try {
    const cookie = session(), other = session()
    const order = (await (await handlers.reserve(request(cookie, cart))).json()).order
    assert.equal(handlers.detail(request(other), order.id).status, 404)
    assert.equal(handlers.cancel(request(other), order.id).status, 404)
    assert.equal(handlers.cancel(request(cookie, undefined, 'https://attacker.example'), order.id).status, 403)
    for (let i = 0; i < 2; i++) assert.equal((await handlers.cancel(request(cookie), order.id).json()).order.status, 'cancelled')
    assert.equal(store.getPublicProduct(catalogSeed[0].id).stock, catalogSeed[0].stock)
    assert.equal(store.listOrderEvents(order.id).length, 2)
  } finally { close() }
})
test('client prices, owner identities, total amounts and oversized carts cannot reach storage', async () => {
  const { handlers, session, store, close } = setup()
  try {
    const cookie = session()
    for (const body of [{ ...cart, total: 1 }, { ...cart, ownerKey: 'impersonated-owner-key' }, { ...cart, items: [{ ...cart.items[0], price: 1 }] }, { ...cart, idempotencyKey: 'x'.repeat(9000) }]) {
      assert.equal((await handlers.reserve(request(cookie, body))).status, 400)
    }
    assert.equal(store.listAdminOrders().length, 0)
  } finally { close() }
})
test('guest expiration revokes access and global/per-owner limits survive HTTP handler recreation', async () => {
  const { handlers, session, store, setClock, close } = setup()
  try {
    const cookie = session()
    for (let i = 0; i < 10; i++) assert.equal((await handlers.reserve(request(cookie, cart))).status, 200)
    assert.equal((await handlers.reserve(request(cookie, cart))).status, 429)
    const fresh = createCheckoutHandlers({ getStore: () => store, config: () => settings })
    assert.equal((await fresh.reserve(request(cookie, cart))).status, 429)
    setClock(1000 + GUEST_SECONDS * 1000)
    assert.equal((await fresh.reserve(request(cookie, cart))).status, 401)
  } finally { close() }
})
test('global session cap and storage failures return bounded generic errors', async () => {
  const { handlers, close } = setup()
  try {
    for (let i = 0; i < 60; i++) assert.equal(handlers.session(request()).status, 200)
    assert.equal(handlers.session(request()).status, 429)
    const broken = createCheckoutHandlers({ getStore: () => { throw new Error('private-path') }, config: () => settings })
    const response = broken.session(request())
    assert.equal(response.status, 503)
    assert.deepEqual(await response.json(), { error: 'service_unavailable' })
  } finally { close() }
})
test('an active receipt can be recovered after a lost response without its order ID', async () => {
  const { handlers, session, close } = setup()
  try {
    const cookie = session(), other = session()
    assert.equal((await handlers.active(request(cookie)).json()).order, null)
    const order = (await (await handlers.reserve(request(cookie, cart))).json()).order
    assert.equal((await handlers.active(request(cookie)).json()).order.id, order.id)
    assert.equal((await handlers.active(request(other)).json()).order, null)
    handlers.cancel(request(cookie), order.id)
    assert.equal((await handlers.active(request(cookie)).json()).order, null)
  } finally { close() }
})
test('guest identity and receipt survive database reopening', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'polymoly-guest-'))
  const filename = join(directory, 'catalog.sqlite')
  let store = openCatalogStore({ filename, seed: catalogSeed, now: () => 1000 })
  const handlers = createCheckoutHandlers({ getStore: () => store, config: () => settings })
  try {
    const cookie = handlers.session(request()).headers.get('set-cookie').split(';')[0]
    const order = (await (await handlers.reserve(request(cookie, cart))).json()).order
    store.close(); store = openCatalogStore({ filename, seed: catalogSeed, now: () => 1001 })
    assert.equal((await handlers.active(request(cookie)).json()).order.id, order.id)
    assert.equal((await (await handlers.reserve(request(cookie, cart))).json()).order.id, order.id)
    assert.equal(store.getPublicProduct(catalogSeed[0].id).stock, catalogSeed[0].stock - 1)
  } finally { store.close(); rmSync(directory, { recursive: true, force: true }) }
})
