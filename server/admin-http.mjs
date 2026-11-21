import { readAdminConfig, verifyAdminPassword, SESSION_SECONDS } from './admin-auth.mjs'
import { CatalogInputError, CatalogConflictError } from './catalog-store.mjs'

const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
const reply = (body, status = 200, extra = {}) => Response.json(body, { status, headers: { ...headers, ...extra } })
const failure = () => reply({ error: 'service_unavailable' }, 503)
const editable = new Set(['title', 'subtitle', 'category', 'price', 'stock', 'color', 'blurb', 'status', 'discount', 'image'])
class BadRequest extends Error {}

async function readJson(request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) throw new BadRequest()
  const reader = request.body?.getReader()
  if (!reader) throw new BadRequest()
  const chunks = []; let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 32768) { await reader.cancel(); throw new BadRequest() }
      chunks.push(Buffer.from(value))
    }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BadRequest()
    return body
  } catch { throw new BadRequest() }
}

function readToken(request, config) {
  const cookies = (request.headers.get('cookie') || '').split(';').map(item => item.trim())
  const matches = cookies.filter(item => item.startsWith(`${config.cookieName}=`))
  return matches.length === 1 ? matches[0].slice(config.cookieName.length + 1) : ''
}
function sessionCookie(token, config, seconds = SESSION_SECONDS) {
  return `${config.cookieName}=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${seconds}${config.secure ? '; Secure' : ''}`
}

export function createAdminHandlers({ getAuthStore, getCatalogStore, config = readAdminConfig, now = Date.now }) {
  function authorize(request, settings) {
    return getAuthStore().isAuthenticated(readToken(request, settings), settings.passwordHash, now())
  }
  const sameOrigin = (request, settings) => request.headers.get('origin') === settings.origin
  return {
    async login(request) {
      try {
        const settings = config()
        if (!sameOrigin(request, settings)) return reply({ error: 'forbidden' }, 403)
        const body = await readJson(request)
        if (Object.keys(body).some(key => key !== 'password') || typeof body.password !== 'string' || body.password.length > 256) return reply({ error: 'invalid_request' }, 400)
        const store = getAuthStore()
        if (!store.allowLoginAttempt(now())) return reply({ error: 'too_many_attempts' }, 429, { 'Retry-After': '900' })
        if (!await verifyAdminPassword(body.password, settings.passwordHash)) return reply({ error: 'invalid_credentials' }, 401)
        const previous = readToken(request, settings)
        store.destroySession(previous)
        const token = store.createSession(settings.passwordHash, now())
        return reply({ authenticated: true }, 200, { 'Set-Cookie': sessionCookie(token, settings) })
      } catch (error) { return error instanceof BadRequest ? reply({ error: 'invalid_request' }, 400) : failure() }
    },
    logout(request) {
      try {
        const settings = config()
        if (!sameOrigin(request, settings)) return reply({ error: 'forbidden' }, 403)
        getAuthStore().destroySession(readToken(request, settings))
        return reply({ authenticated: false }, 200, { 'Set-Cookie': sessionCookie('', settings, 0) })
      } catch { return failure() }
    },
    session(request) {
      try { return authorize(request, config()) ? reply({ authenticated: true }) : reply({ error: 'unauthorized' }, 401) }
      catch { return failure() }
    },
    products(request) {
      try {
        if (!authorize(request, config())) return reply({ error: 'unauthorized' }, 401)
        return reply({ products: getCatalogStore().listAdminProducts() })
      } catch { return failure() }
    },
    async save(request, id) {
      try {
        const settings = config()
        if (!sameOrigin(request, settings)) return reply({ error: 'forbidden' }, 403)
        if (!authorize(request, settings)) return reply({ error: 'unauthorized' }, 401)
        if (id !== undefined && (typeof id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,99}$/.test(id))) return reply({ error: 'product_not_found' }, 404)
        const body = await readJson(request)
        if (Object.keys(body).some(key => !editable.has(key) && !(id === undefined && key === 'id'))) return reply({ error: 'invalid_product' }, 400)
        const store = getCatalogStore()
        if (id === undefined) {
          const product = { ...body, source: 'official' }
          store.createProduct(product)
          return reply({ product: store.getAdminProduct(product.id) }, 201)
        }
        const current = store.getAdminProduct(id)
        if (!current) return reply({ error: 'product_not_found' }, 404)
        const product = { ...current, ...body, id, source: 'official' }
        store.updateProduct(product)
        return reply({ product: store.getAdminProduct(id) })
      } catch (error) {
        if (error instanceof CatalogConflictError) return reply({ error: 'product_exists' }, 409)
        if (error instanceof CatalogInputError || error instanceof BadRequest) return reply({ error: 'invalid_product' }, 400)
        return failure()
      }
    },
  }
}
