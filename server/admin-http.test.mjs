import { test } from 'node:test'
import assert from 'node:assert/strict'
import { openAdminStore, hashAdminPassword, SESSION_SECONDS } from './admin-auth.mjs'
import { openCatalogStore } from './catalog-store.mjs'
import { createAdminHandlers } from './admin-http.mjs'
import { catalogSeed } from '../src/data/catalog-seed.js'

const origin = 'https://polymoly.ir'
const password = 'a-long-admin-test-password'
const passwordHash = await hashAdminPassword(password)
const config = () => ({ origin, passwordHash, secure: true, cookieName: '__Host-polymoly_admin' })
function request(path, { method = 'GET', cookie = '', body, from = origin, raw, contentType = 'application/json' } = {}) {
  return new Request(`${origin}/api/admin/${path}`, {
    method, headers: { Origin: from, Cookie: cookie, ...(method !== 'GET' ? { 'Content-Type': contentType } : {}) },
    ...(body !== undefined || raw !== undefined ? { body: raw ?? JSON.stringify(body) } : {}),
  })
}
function setup(options = {}) {
  const auth = openAdminStore(':memory:')
  const catalog = openCatalogStore({ filename: ':memory:', seed: catalogSeed })
  const handlers = createAdminHandlers({ getAuthStore: () => auth, getCatalogStore: () => catalog, config, now: () => 1000, ...options })
  return { auth, catalog, handlers, close: () => { auth.close(); catalog.close() } }
}
async function login(handlers) {
  const response = await handlers.login(request('login', { method: 'POST', body: { password } }))
  assert.equal(response.status, 200)
  return response.headers.get('set-cookie').split(';')[0]
}

test('login issues a secure HTTP-only cookie, session authenticates and logout revokes it', async () => {
  const { handlers, close } = setup()
  try {
    const response = await handlers.login(request('login', { method: 'POST', body: { password } }))
    assert.equal(response.status, 200)
    const cookie = response.headers.get('set-cookie')
    for (const flag of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/']) assert.ok(cookie.includes(flag))
    assert.deepEqual(await response.json(), { authenticated: true })
    const tokenCookie = cookie.split(';')[0]
    assert.equal(handlers.session(request('session', { cookie: tokenCookie })).status, 200)
    const logout = handlers.logout(request('logout', { method: 'POST', cookie: tokenCookie }))
    assert.equal(logout.status, 200)
    assert.ok(logout.headers.get('set-cookie').includes('Max-Age=0'))
    assert.equal(handlers.session(request('session', { cookie: tokenCookie })).status, 401)
  } finally { close() }
})

test('unauthenticated or forged-session callers cannot read or change admin products', async () => {
  const { handlers, catalog, close } = setup()
  try {
    for (const cookie of ['', '__Host-polymoly_admin=admin1405', 'boofeh-session=admin']) {
      assert.equal(handlers.products(request('products', { cookie })).status, 401)
      assert.equal((await handlers.save(request('products', { method: 'PATCH', cookie, body: { stock: 0 } }), catalogSeed[0].id)).status, 401)
    }
    assert.equal(catalog.listAudit().length, 0)
  } finally { close() }
})

test('expired sessions and duplicate cookie values cannot change products', async () => {
  let clock = 1000
  const { handlers, catalog, close } = setup({ now: () => clock })
  try {
    const cookie = await login(handlers)
    assert.equal(handlers.products(request('products', { cookie: `${cookie}; ${cookie}` })).status, 401)
    clock += SESSION_SECONDS * 1000
    assert.equal(handlers.products(request('products', { cookie })).status, 401)
    assert.equal((await handlers.save(request('products', { method: 'PATCH', cookie, body: { stock: 0 } }), catalogSeed[0].id)).status, 401)
    assert.equal(catalog.listAudit().length, 0)
  } finally { close() }
})

test('cross-origin and originless mutations are denied before authentication or body processing', async () => {
  const { handlers, close } = setup()
  try {
    const cookie = await login(handlers)
    for (const from of ['https://attacker.example', '', 'null']) {
      assert.equal((await handlers.login(request('login', { method: 'POST', from, body: { password } }))).status, 403)
      assert.equal(handlers.logout(request('logout', { method: 'POST', from, cookie })).status, 403)
      assert.equal((await handlers.save(request('products', { method: 'PATCH', cookie, from, body: { stock: 0 } }), catalogSeed[0].id)).status, 403)
    }
  } finally { close() }
})

test('authenticated product edits persist and are recorded atomically in the audit log', async () => {
  const { handlers, catalog, close } = setup()
  try {
    const cookie = await login(handlers)
    const id = catalogSeed[0].id
    const saved = await handlers.save(request('products', { method: 'PATCH', cookie, body: { price: 111000, stock: 3, expectedStock: catalogSeed[0].stock, status: 'archived' } }), id)
    assert.equal(saved.status, 200)
    assert.equal(catalog.getPublicProduct(id), null)
    assert.equal(catalog.getAdminProduct(id).price, 111000)
    const audit = catalog.listAudit()[0]
    assert.equal(audit.action, 'update')
    assert.equal(JSON.parse(audit.after_json).stock, 3)
    assert.equal(JSON.parse(audit.before_json).stock, catalogSeed[0].stock)
    const invalid = await handlers.save(request('products', { method: 'PATCH', cookie, body: { stock: -1, expectedStock: 3 } }), id)
    assert.equal(invalid.status, 400)
    assert.equal(catalog.listAudit().length, 1)
    const listing = await handlers.products(request('products', { cookie })).json()
    assert.equal(listing.products.length, 9)
  } finally { close() }
})

test('new products default to server-controlled ownership and reject duplicate or injected fields', async () => {
  const { handlers, catalog, close } = setup()
  try {
    const cookie = await login(handlers)
    const { source, ...draft } = { ...catalog.getAdminProduct(catalogSeed[0].id), id: 'new-tee', status: 'pending' }
    assert.equal((await handlers.save(request('products', { method: 'POST', cookie, body: draft }), undefined)).status, 201)
    assert.equal(catalog.getAdminProduct('new-tee').source, 'official')
    assert.equal(catalog.getPublicProduct('new-tee'), null)
    assert.equal((await handlers.save(request('products', { method: 'POST', cookie, body: draft }), undefined)).status, 409)
    for (const body of [{ source: 'student' }, { id: 'changed' }, { role: 'admin' }, { discount: 101 }]) {
      assert.equal((await handlers.save(request('products', { method: 'PATCH', cookie, body }), draft.id)).status, 400)
    }
    assert.equal(catalog.listAudit().length, 1)
  } finally { close() }
})

test('invalid JSON, oversized bodies and wrong content types cause no writes', async () => {
  const { handlers, catalog, close } = setup()
  try {
    const cookie = await login(handlers)
    for (const raw of ['{', '[]', JSON.stringify({ blurb: 'x'.repeat(33000) })]) {
      assert.equal((await handlers.save(request('products', { method: 'PATCH', cookie, raw }), catalogSeed[0].id)).status, 400)
    }
    assert.equal((await handlers.save(request('products', { method: 'PATCH', cookie, contentType: 'text/plain', body: { stock: 0 } }), catalogSeed[0].id)).status, 400)
    assert.equal(catalog.listAudit().length, 0)
  } finally { close() }
})

test('login limits attempts and does not accept the demo administrator password', async () => {
  const { handlers, close } = setup()
  try {
    for (let i = 0; i < 5; i++) assert.equal((await handlers.login(request('login', { method: 'POST', body: { password: 'admin1405' } }))).status, 401)
    const throttled = await handlers.login(request('login', { method: 'POST', body: { password } }))
    assert.equal(throttled.status, 429)
    assert.ok(throttled.headers.get('retry-after'))
  } finally { close() }
})

test('unconfigured administrator returns generic 503 without exposing internal errors', async () => {
  const { handlers, close } = setup({ config: () => { throw new Error('secret configuration path') } })
  try {
    const response = await handlers.login(request('login', { method: 'POST', body: { password } }))
    assert.equal(response.status, 503)
    assert.deepEqual(await response.json(), { error: 'service_unavailable' })
  } finally { close() }
})

test('order access requires authentication and cancellation requires the configured origin', async () => {
  const { handlers, catalog, close } = setup()
  try {
    const order = catalog.reserveOrder({ items: [{ productId: catalogSeed[0].id, quantity: 1 }], ownerKey: 'admin-order-owner-0001', idempotencyKey: 'admin-order-key-0001' })
    assert.equal(handlers.orders(request('orders')).status, 401)
    assert.equal(handlers.cancelOrder(request('orders', { method: 'POST' }), order.id).status, 401)
    const cookie = await login(handlers)
    assert.equal(handlers.cancelOrder(request('orders', { method: 'POST', cookie, from: 'https://attacker.example' }), order.id).status, 403)
    assert.equal(catalog.listAdminOrders()[0].status, 'pending_payment')
  } finally { close() }
})

test('administrator lists orders and cancels a reservation without restoring stock twice', async () => {
  const { handlers, catalog, close } = setup()
  try {
    const product = catalogSeed[0]
    const order = catalog.reserveOrder({ items: [{ productId: product.id, quantity: 2 }], ownerKey: 'admin-order-owner-0001', idempotencyKey: 'admin-order-key-0001' })
    const cookie = await login(handlers)
    const listing = handlers.orders(request('orders', { cookie }))
    assert.equal(listing.status, 200)
    assert.equal((await listing.json()).orders[0].id, order.id)
    for (let i = 0; i < 2; i++) {
      const cancelled = handlers.cancelOrder(request('orders', { method: 'POST', cookie }), order.id)
      assert.equal(cancelled.status, 200)
      assert.equal((await cancelled.json()).order.status, 'cancelled')
    }
    assert.equal(catalog.getPublicProduct(product.id).stock, product.stock)
    assert.equal(catalog.listOrderEvents(order.id).length, 2)
    assert.equal(handlers.cancelOrder(request('orders', { method: 'POST', cookie }), '00000000-0000-0000-0000-000000000000').status, 404)
    assert.equal(handlers.cancelOrder(request('orders', { method: 'POST', cookie }), '../invalid').status, 404)
  } finally { close() }
})

test('order database failures return generic service errors', async () => {
  const { handlers, close } = setup({ getCatalogStore: () => { throw new Error('private-db-path') } })
  try {
    const cookie = await login(handlers)
    for (const response of [handlers.orders(request('orders', { cookie })), handlers.cancelOrder(request('orders', { method: 'POST', cookie }), '00000000-0000-0000-0000-000000000000')]) {
      assert.equal(response.status, 503)
      assert.deepEqual(await response.json(), { error: 'service_unavailable' })
    }
  } finally { close() }
})

test('stale admin edits cannot overwrite stock reserved by an intervening order', async () => {
  const { handlers, catalog, close } = setup()
  try {
    const original = catalogSeed[0]
    const cookie = await login(handlers)
    catalog.reserveOrder({ items: [{ productId: original.id, quantity: 1 }], ownerKey: 'admin-order-owner-0001', idempotencyKey: 'admin-order-key-0001' })
    const stale = await handlers.save(request('products', { method: 'PATCH', cookie, body: { price: 100000, stock: original.stock, expectedStock: original.stock } }), original.id)
    assert.equal(stale.status, 409)
    assert.deepEqual(await stale.json(), { error: 'inventory_changed' })
    assert.equal(catalog.getPublicProduct(original.id).stock, original.stock - 1)
    assert.equal(catalog.listAudit().length, 0)
    const fresh = await handlers.save(request('products', { method: 'PATCH', cookie, body: { price: 100000, stock: original.stock - 1, expectedStock: original.stock - 1 } }), original.id)
    assert.equal(fresh.status, 200)
  } finally { close() }
})
