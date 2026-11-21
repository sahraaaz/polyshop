import { createHash, randomUUID } from 'node:crypto'

export class OrderInputError extends Error {}
export class OrderConflictError extends Error {}
export const RESERVATION_MS = 15 * 60 * 1000
const digest = value => createHash('sha256').update(value).digest('hex')
const ownerHash = value => {
  if (typeof value !== 'string' || value.length < 16 || value.length > 128) throw new OrderInputError('Invalid order owner')
  return digest(value)
}

function validateRequest(input) {
  if (!input || typeof input !== 'object' || Object.keys(input).some(key => !['items', 'idempotencyKey', 'ownerKey'].includes(key))) throw new OrderInputError('Invalid order')
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 20) throw new OrderInputError('Invalid items')
  if (typeof input.idempotencyKey !== 'string' || !/^[a-zA-Z0-9_-]{16,100}$/.test(input.idempotencyKey)) throw new OrderInputError('Invalid idempotency key')
  const owner = ownerHash(input.ownerKey)
  const ids = new Set()
  const items = input.items.map(item => {
    if (!item || Object.keys(item).some(key => !['productId', 'quantity'].includes(key)) || typeof item.productId !== 'string' || !/^[a-z0-9][a-z0-9-]{0,99}$/.test(item.productId) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20 || ids.has(item.productId)) throw new OrderInputError('Invalid order line')
    ids.add(item.productId)
    return { productId: item.productId, quantity: item.quantity }
  }).sort((a, b) => a.productId.localeCompare(b.productId))
  return { items, owner, key: input.idempotencyKey, requestHash: digest(JSON.stringify(items)) }
}

// Shares the catalog connection so inventory and reservations commit atomically.
// This is an internal domain API; there is no public checkout endpoint yet.
export function createOrderStorage(db, now = Date.now) {
  db.exec(`CREATE TABLE IF NOT EXISTS shop_orders (
    id TEXT PRIMARY KEY, owner_hash TEXT NOT NULL, idempotency_key TEXT NOT NULL,
    request_hash TEXT NOT NULL, status TEXT NOT NULL CHECK (status IN ('pending_payment', 'cancelled', 'expired')),
    total INTEGER NOT NULL CHECK (total >= 0), currency TEXT NOT NULL CHECK (currency = 'TMN'),
    created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,
    UNIQUE(owner_hash, idempotency_key)
  );
  CREATE TABLE IF NOT EXISTS shop_order_items (
    order_id TEXT NOT NULL REFERENCES shop_orders(id), product_id TEXT NOT NULL REFERENCES catalog_products(id),
    title TEXT NOT NULL, quantity INTEGER NOT NULL CHECK(quantity > 0), unit_price INTEGER NOT NULL CHECK(unit_price >= 0),
    PRIMARY KEY(order_id, product_id)
  );
  CREATE TABLE IF NOT EXISTS shop_order_events (
    id INTEGER PRIMARY KEY, order_id TEXT NOT NULL REFERENCES shop_orders(id),
    action TEXT NOT NULL, created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS shop_orders_expiry ON shop_orders(status, expires_at);`)

  const orderById = db.prepare('SELECT * FROM shop_orders WHERE id = ?')
  const lines = db.prepare('SELECT product_id AS productId, title, quantity, unit_price AS unitPrice FROM shop_order_items WHERE order_id = ? ORDER BY product_id')
  const addEvent = db.prepare('INSERT INTO shop_order_events(order_id, action, created_at) VALUES (?, ?, ?)')
  const releaseStock = db.prepare('UPDATE catalog_products SET stock = stock + ? WHERE id = ?')
  function transaction(callback) {
    db.exec('BEGIN IMMEDIATE')
    try { const result = callback(); db.exec('COMMIT'); return result }
    catch (error) { db.exec('ROLLBACK'); throw error }
  }
  function view(row) {
    if (!row) return null
    return { id: row.id, status: row.status, total: row.total, currency: row.currency, createdAt: row.created_at, expiresAt: row.expires_at, items: lines.all(row.id).map(item => ({ ...item })) }
  }
  function release(row, status, timestamp) {
    if (row.status !== 'pending_payment') return
    for (const item of lines.all(row.id)) releaseStock.run(item.quantity, item.productId)
    db.prepare('UPDATE shop_orders SET status = ? WHERE id = ? AND status = ?').run(status, row.id, 'pending_payment')
    addEvent.run(row.id, status, timestamp)
  }
  function expireInternal(timestamp) {
    const expired = db.prepare("SELECT * FROM shop_orders WHERE status = 'pending_payment' AND expires_at <= ?").all(timestamp)
    for (const order of expired) release(order, 'expired', timestamp)
    return expired.length
  }
  function expireReservations() {
    const timestamp = now()
    if (!db.prepare("SELECT 1 FROM shop_orders WHERE status = 'pending_payment' AND expires_at <= ? LIMIT 1").get(timestamp)) return 0
    return transaction(() => expireInternal(timestamp))
  }

  return {
    expireReservations,
    reserveOrder(input) {
      const request = validateRequest(input)
      return transaction(() => {
        const timestamp = now()
        expireInternal(timestamp)
        const existing = db.prepare('SELECT * FROM shop_orders WHERE owner_hash = ? AND idempotency_key = ?').get(request.owner, request.key)
        if (existing) {
          if (existing.request_hash !== request.requestHash) throw new OrderConflictError('Idempotency key was already used for another cart')
          return view(existing)
        }
        const prepared = []; let total = 0n
        for (const item of request.items) {
          const product = db.prepare("SELECT * FROM catalog_products WHERE id = ? AND status = 'approved'").get(item.productId)
          if (!product || product.stock < item.quantity) throw new OrderConflictError('Product unavailable')
          const price = (BigInt(product.price) * BigInt(100 - product.discount) + 50n) / 100n
          total += price * BigInt(item.quantity)
          if (total > BigInt(Number.MAX_SAFE_INTEGER)) throw new OrderInputError('Order total exceeds supported amount')
          const changed = db.prepare("UPDATE catalog_products SET stock = stock - ? WHERE id = ? AND status = 'approved' AND stock >= ?").run(item.quantity, item.productId, item.quantity)
          if (Number(changed.changes) !== 1) throw new OrderConflictError('Product unavailable')
          prepared.push({ ...item, title: product.title, unitPrice: Number(price) })
        }
        const id = randomUUID()
        db.prepare("INSERT INTO shop_orders VALUES (?, ?, ?, ?, 'pending_payment', ?, 'TMN', ?, ?)").run(id, request.owner, request.key, request.requestHash, Number(total), timestamp, timestamp + RESERVATION_MS)
        const insertLine = db.prepare('INSERT INTO shop_order_items VALUES (?, ?, ?, ?, ?)')
        for (const item of prepared) insertLine.run(id, item.productId, item.title, item.quantity, item.unitPrice)
        addEvent.run(id, 'reserved', timestamp)
        return view(orderById.get(id))
      })
    },
    getOwnedOrder(id, ownerKey) {
      const owner = ownerHash(ownerKey)
      expireReservations()
      return view(db.prepare('SELECT * FROM shop_orders WHERE id = ? AND owner_hash = ?').get(id, owner))
    },
    listAdminOrders() {
      expireReservations()
      return db.prepare('SELECT * FROM shop_orders ORDER BY created_at DESC, rowid DESC LIMIT 100').all().map(view)
    },
    cancelAdminOrder(id) {
      return transaction(() => {
        const timestamp = now()
        expireInternal(timestamp)
        const order = orderById.get(id)
        if (!order) return null
        release(order, 'cancelled', timestamp)
        return view(orderById.get(id))
      })
    },
    listOrderEvents(id) { return db.prepare('SELECT action, created_at AS createdAt FROM shop_order_events WHERE order_id = ? ORDER BY id').all(id).map(row => ({ ...row })) },
  }
}
