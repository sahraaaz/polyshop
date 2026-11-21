import { createHash } from 'node:crypto'
import { GUEST_SECONDS } from './guest-store.mjs'
import { OrderInputError, OrderConflictError } from './order-store.mjs'

const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
const reply = (body, status = 200, extra = {}) => Response.json(body, { status, headers: { ...headers, ...extra } })
export function readCheckoutConfig() {
  const url = new URL(process.env.CHECKOUT_ORIGIN || 'https://polymoly.ir')
  const secure = url.protocol === 'https:'
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash || (!secure && !(process.env.NODE_ENV !== 'production' && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) throw new Error('Invalid checkout origin')
  return { enabled: process.env.CHECKOUT_ENABLED === 'true', origin: url.origin, secure, cookieName: secure ? '__Host-polymoly_guest' : 'polymoly_guest_dev' }
}
function tokenFrom(request, config) {
  const matches = (request.headers.get('cookie') || '').split(';').map(value => value.trim()).filter(value => value.startsWith(`${config.cookieName}=`))
  return matches.length === 1 ? matches[0].slice(config.cookieName.length + 1) : ''
}
async function cartBody(request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) throw new OrderInputError('Invalid content type')
  const reader = request.body?.getReader()
  if (!reader) throw new OrderInputError('Missing body')
  const chunks = []; let bytes = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > 8192) { await reader.cancel(); throw new Error('Too large') }
      chunks.push(Buffer.from(value))
    }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['items', 'idempotencyKey'].includes(key))) throw new Error('Invalid cart')
    return body
  } catch { throw new OrderInputError('Invalid body') }
}

export function createCheckoutHandlers({ getStore, config = readCheckoutConfig }) {
  function settingsFor(request, mutation) {
    const settings = config()
    if (!settings.enabled) return { response: reply({ error: 'checkout_unavailable' }, 503) }
    if (mutation && request.headers.get('origin') !== settings.origin) return { response: reply({ error: 'forbidden' }, 403) }
    return { settings }
  }
  const limited = () => reply({ error: 'too_many_attempts' }, 429, { 'Retry-After': '900' })
  function handleError(error) {
    if (error instanceof OrderInputError) return reply({ error: 'invalid_cart' }, 400)
    if (error instanceof OrderConflictError) return reply({ error: 'reservation_conflict' }, 409)
    return reply({ error: 'service_unavailable' }, 503)
  }
  return {
    session(request) {
      try {
        const { settings, response } = settingsFor(request, true)
        if (response) return response
        const store = getStore(); let token = tokenFrom(request, settings)
        if (store.isGuestSession(token)) return reply({ ready: true })
        if (!store.allowCheckoutAttempt('global:session', 60)) return limited()
        token = store.createGuestSession()
        return reply({ ready: true }, 200, { 'Set-Cookie': `${settings.cookieName}=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${GUEST_SECONDS}${settings.secure ? '; Secure' : ''}` })
      } catch (error) { return handleError(error) }
    },
    async reserve(request) {
      try {
        const { settings, response } = settingsFor(request, true)
        if (response) return response
        const store = getStore(), token = tokenFrom(request, settings)
        if (!store.isGuestSession(token)) return reply({ error: 'unauthorized' }, 401)
        const body = await cartBody(request)
        const ownerBucket = `owner:${createHash('sha256').update(token).digest('hex')}`
        if (!store.allowCheckoutAttempt(ownerBucket, 10) || !store.allowCheckoutAttempt('global:reserve', 60)) return limited()
        return reply({ order: store.reserveOrder({ ...body, ownerKey: token }, 1) }, 200)
      } catch (error) { return handleError(error) }
    },
    detail(request, id) {
      try {
        const { settings, response } = settingsFor(request, false)
        if (response) return response
        const store = getStore(), token = tokenFrom(request, settings)
        if (!store.isGuestSession(token)) return reply({ error: 'unauthorized' }, 401)
        if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/.test(id)) return reply({ error: 'order_not_found' }, 404)
        const order = store.getOwnedOrder(id, token)
        return order ? reply({ order }) : reply({ error: 'order_not_found' }, 404)
      } catch (error) { return handleError(error) }
    },
    active(request) {
      try {
        const { settings, response } = settingsFor(request, false)
        if (response) return response
        const store = getStore(), token = tokenFrom(request, settings)
        if (!store.isGuestSession(token)) return reply({ error: 'unauthorized' }, 401)
        return reply({ order: store.getActiveOwnedOrder(token) })
      } catch (error) { return handleError(error) }
    },
    cancel(request, id) {
      try {
        const { settings, response } = settingsFor(request, true)
        if (response) return response
        const store = getStore(), token = tokenFrom(request, settings)
        if (!store.isGuestSession(token)) return reply({ error: 'unauthorized' }, 401)
        if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/.test(id)) return reply({ error: 'order_not_found' }, 404)
        const order = store.cancelOwnedOrder(id, token)
        return order ? reply({ order }) : reply({ error: 'order_not_found' }, 404)
      } catch (error) { return handleError(error) }
    },
  }
}
