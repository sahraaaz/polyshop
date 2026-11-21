import { openAdminStore } from './admin-auth.mjs'
import { catalogDatabasePath } from './catalog-service.mjs'

const key = Symbol.for('polymoly.admin-store.v1')
export function getAdminStore() {
  const filename = `${catalogDatabasePath()}.admin.sqlite`
  const current = globalThis[key]
  if (current) {
    if (current.filename !== filename) throw new Error('Restart after changing the database path')
    return current.store
  }
  const store = openAdminStore(filename)
  globalThis[key] = { filename, store }
  return store
}
