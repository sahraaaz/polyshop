import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { randomBytes, randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { hashAdminPassword } from '../server/admin-auth.mjs'

const nextBin = createRequire(import.meta.url).resolve('next/dist/bin/next')
const password = randomBytes(24).toString('hex')
const passwordHash = await hashAdminPassword(password)
const directory = mkdtempSync(join(tmpdir(), 'polymoly-next-flows-'))
const origin = 'http://127.0.0.1:3188'
const trustedOrigin = 'https://polymoly.ir'
const server = spawn(process.execPath, [nextBin, 'start', '--hostname', '127.0.0.1', '--port', '3188'], {
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', SITE_INDEXABLE: 'false', CHECKOUT_ENABLED: 'true', ADMIN_ORIGIN: trustedOrigin, CHECKOUT_ORIGIN: trustedOrigin, ADMIN_PASSWORD_HASH: passwordHash, POLYMOLY_DATABASE_FILE: join(directory, 'catalog.sqlite') },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let output = ''
server.stdout.on('data', chunk => { output = (output + chunk).slice(-16000) })
server.stderr.on('data', chunk => { output = (output + chunk).slice(-16000) })
const cookieFrom = response => {
  const header = response.headers.get('set-cookie')
  assert.ok(header?.includes('HttpOnly') && header.includes('Secure') && header.includes('SameSite=Strict'))
  return header.split(';')[0]
}
async function call(path, { method = 'GET', cookie = '', body, from = trustedOrigin } = {}) {
  return fetch(`${origin}${path}`, {
    method, headers: { Origin: from, Cookie: cookie, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(10000),
  })
}
try {
  let ready = false
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(`Next exited early: ${output}`)
    try { if ((await fetch(`${origin}/healthz`, { signal: AbortSignal.timeout(1000) })).ok) { ready = true; break } } catch {}
    await new Promise(resolve => setTimeout(resolve, 300))
  }
  assert.ok(ready, output)
  assert.equal((await call('/api/admin/products')).status, 401)
  assert.equal((await call('/api/admin/login', { method: 'POST', body: { password }, from: 'https://attacker.example' })).status, 403)
  const login = await call('/api/admin/login', { method: 'POST', body: { password } })
  assert.equal(login.status, 200)
  const adminCookie = cookieFrom(login)
  const products = await (await call('/api/admin/products', { cookie: adminCookie })).json()
  assert.equal(products.products.length, 9)
  const product = products.products[0]
  const edited = await call(`/api/admin/products/${product.id}`, { method: 'PATCH', cookie: adminCookie, body: { price: 123000, stock: 3, expectedStock: product.stock, discount: 0 } })
  assert.equal(edited.status, 200)
  assert.equal((await (await call(`/api/products/${product.id}`)).json()).product.stock, 3)
  assert.equal((await call('/checkout')).status, 200)
  const session = await call('/api/checkout/session', { method: 'POST' })
  assert.equal(session.status, 200)
  const guestCookie = cookieFrom(session)
  const cart = { items: [{ productId: product.id, quantity: 2 }], idempotencyKey: randomUUID() }
  const reserved = await call('/api/checkout/orders', { method: 'POST', cookie: guestCookie, body: cart })
  assert.equal(reserved.status, 200)
  const order = (await reserved.json()).order
  assert.equal(order.total, 246000)
  assert.equal(order.currency, 'TMN')
  const retry = await call('/api/checkout/orders', { method: 'POST', cookie: guestCookie, body: cart })
  assert.equal((await retry.json()).order.id, order.id)
  assert.equal((await (await call(`/api/products/${product.id}`)).json()).product.stock, 1)
  const staleEdit = await call(`/api/admin/products/${product.id}`, { method: 'PATCH', cookie: adminCookie, body: { stock: 3, expectedStock: 3 } })
  assert.equal(staleEdit.status, 409)
  const otherSession = await call('/api/checkout/session', { method: 'POST' })
  const otherCookie = cookieFrom(otherSession)
  assert.equal((await call(`/api/checkout/orders/${order.id}`, { cookie: otherCookie })).status, 404)
  assert.equal((await call(`/api/checkout/orders/${order.id}/cancel`, { method: 'POST', cookie: otherCookie })).status, 404)
  assert.equal((await (await call('/api/checkout/orders/active', { cookie: guestCookie })).json()).order.id, order.id)
  const cancelled = await call(`/api/checkout/orders/${order.id}/cancel`, { method: 'POST', cookie: guestCookie })
  assert.equal(cancelled.status, 200)
  assert.equal((await cancelled.json()).order.status, 'cancelled')
  assert.equal((await (await call(`/api/products/${product.id}`)).json()).product.stock, 3)
  assert.equal((await (await call('/api/admin/orders', { cookie: adminCookie })).json()).orders[0].status, 'cancelled')
  assert.equal((await call('/api/admin/logout', { method: 'POST', cookie: adminCookie })).status, 200)
  assert.equal((await call('/api/admin/products', { cookie: adminCookie })).status, 401)
  console.log('Built Next.js flow checks passed: admin login/edit/logout, guest reserve/retry/recover/cancel, ownership and stock conflicts.')
} catch (error) { console.error(output); throw error }
finally {
  if (server.exitCode === null && server.signalCode === null) {
    const stopped = new Promise(resolve => server.once('close', resolve))
    server.kill(); await stopped
  }
  rmSync(directory, { recursive: true, force: true })
}
