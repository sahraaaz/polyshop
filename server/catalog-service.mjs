import { isAbsolute, relative, resolve, sep } from 'node:path'
import { openCatalogStore } from './catalog-store.mjs'
import { catalogSeed } from '../src/data/catalog-seed.js'

export function catalogDatabasePath(root = process.cwd(), configuredPath = process.env.POLYMOLY_DATABASE_FILE) {
  const filename = resolve(root, configuredPath || 'data/polymoly.sqlite')
  // Neither SQLite nor its WAL files may live in a directory served as static files.
  for (const directory of ['public', 'dist', 'out', '.next']) {
    const location = relative(resolve(root, directory), filename)
    if (location === '' || (!isAbsolute(location) && location !== '..' && !location.startsWith(`..${sep}`))) {
      throw new Error('Catalog database must be outside web assets and build output')
    }
  }
  return filename
}

// One connection per process, also across module reloads in Next development.
const key = Symbol.for('polymoly.catalog-store.v1')

export function getCatalogStore() {
  const filename = catalogDatabasePath()
  const current = globalThis[key]
  if (current) {
    if (current.filename !== filename) throw new Error('Restart the service after changing the database path')
    return current.store
  }
  const store = openCatalogStore({ filename, seed: catalogSeed })
  globalThis[key] = { filename, store }
  return store
}
