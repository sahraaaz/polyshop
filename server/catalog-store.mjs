import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const statuses = new Set(['approved', 'pending', 'archived'])

export class CatalogInputError extends Error {}
export class CatalogConflictError extends Error {}

function validateProduct(product) {
  if (!product || typeof product.id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,99}$/.test(product.id)) throw new CatalogInputError('Invalid product id')
  for (const key of ['title', 'subtitle', 'category', 'color', 'blurb']) {
    if (typeof product[key] !== 'string' || product[key].length > 10000 || (key === 'title' && !product[key].trim())) throw new CatalogInputError(`Invalid ${key}`)
  }
  for (const key of ['price', 'stock']) {
    if (!Number.isSafeInteger(product[key]) || product[key] < 0) throw new CatalogInputError(`Invalid ${key}`)
  }
  if (!Number.isInteger(product.discount) || product.discount < 0 || product.discount > 100) throw new CatalogInputError('Invalid discount')
  if (product.source !== 'official' || !statuses.has(product.status)) throw new CatalogInputError('Invalid catalog source or status')
  if (typeof product.image !== 'string' || !/^\/products\/[a-zA-Z0-9-]+\.jpg$/.test(product.image)) throw new CatalogInputError('Invalid image')
}

const fields = ['id', 'title', 'subtitle', 'category', 'price', 'stock', 'color', 'blurb', 'source', 'status', 'discount', 'image']
const columns = fields.join(', ')

/** Internal catalog storage. Do not expose write methods without server authentication. */
export function openCatalogStore({ filename, seed = [] }) {
  if (typeof filename !== 'string' || !filename) throw new Error('Database filename is required')
  // Validate the whole batch before creating or modifying persistent state.
  seed.forEach(validateProduct)
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true })
  const db = new DatabaseSync(filename)
  try {
    db.exec('PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;')
    if (filename !== ':memory:') db.exec('PRAGMA journal_mode = WAL;')
    const version = Number(db.prepare('PRAGMA user_version').get().user_version)
    if (version > 1) throw new Error('Unsupported catalog schema version')
    db.exec('BEGIN IMMEDIATE')
    try {
      db.exec(`CREATE TABLE IF NOT EXISTS catalog_products (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        subtitle TEXT NOT NULL,
        category TEXT NOT NULL,
        price INTEGER NOT NULL CHECK (price >= 0),
        stock INTEGER NOT NULL CHECK (stock >= 0),
        color TEXT NOT NULL,
        blurb TEXT NOT NULL,
        source TEXT NOT NULL CHECK (source = 'official'),
        status TEXT NOT NULL CHECK (status IN ('approved', 'pending', 'archived')),
        discount INTEGER NOT NULL CHECK (discount BETWEEN 0 AND 100),
        image TEXT NOT NULL
      ); PRAGMA user_version = 1;`)
      db.exec(`CREATE TABLE IF NOT EXISTS catalog_audit (
        id INTEGER PRIMARY KEY, product_id TEXT NOT NULL, action TEXT NOT NULL,
        before_json TEXT, after_json TEXT NOT NULL, created_at INTEGER NOT NULL
      )`)
      const insert = db.prepare(`INSERT INTO catalog_products (${columns}) VALUES (${fields.map(() => '?').join(', ')}) ON CONFLICT(id) DO NOTHING`)
      for (const product of seed) insert.run(...fields.map(field => product[field]))
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
    const publicList = db.prepare(`SELECT ${columns} FROM catalog_products WHERE status = 'approved' ORDER BY rowid`)
    const publicProduct = db.prepare(`SELECT ${columns} FROM catalog_products WHERE id = ? AND status = 'approved'`)
    const update = db.prepare(`UPDATE catalog_products SET ${fields.slice(1).map(field => `${field} = ?`).join(', ')} WHERE id = ?`)
    const all = db.prepare(`SELECT ${columns} FROM catalog_products ORDER BY rowid`)
    const byId = db.prepare(`SELECT ${columns} FROM catalog_products WHERE id = ?`)
    const create = db.prepare(`INSERT INTO catalog_products (${columns}) VALUES (${fields.map(() => '?').join(', ')})`)
    const audit = db.prepare('INSERT INTO catalog_audit (product_id, action, before_json, after_json, created_at) VALUES (?, ?, ?, ?, ?)')
    function saveProduct(product, creating) {
      validateProduct(product)
      db.exec('BEGIN IMMEDIATE')
      try {
        const before = byId.get(product.id)
        if (creating && before) throw new CatalogConflictError('Product already exists')
        if (!creating && !before) throw new CatalogInputError('Product not found')
        if (creating) create.run(...fields.map(field => product[field]))
        else update.run(...fields.slice(1).map(field => product[field]), product.id)
        audit.run(product.id, creating ? 'create' : 'update', before ? JSON.stringify(before) : null, JSON.stringify(product), Date.now())
        db.exec('COMMIT')
      } catch (error) { db.exec('ROLLBACK'); throw error }
    }
    return {
      listAdminProducts: () => all.all().map(row => ({ ...row })),
      getAdminProduct: id => { const row = byId.get(id); return row ? { ...row } : null },
      listAudit: () => db.prepare('SELECT * FROM catalog_audit ORDER BY id DESC LIMIT 100').all().map(row => ({ ...row })),
      listPublicProducts: () => publicList.all().map(row => ({ ...row })),
      getPublicProduct: id => {
        if (typeof id !== 'string') return null
        const row = publicProduct.get(id)
        return row ? { ...row } : null
      },
      // This is intentionally internal; there is no public product mutation API.
      updateProduct(product) {
        saveProduct(product, false)
      },
      createProduct: product => saveProduct(product, true),
      close: () => db.close(),
    }
  } catch (error) {
    db.close()
    throw error
  }
}
