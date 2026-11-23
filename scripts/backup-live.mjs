import { DatabaseSync, backup } from 'node:sqlite'
import { access, mkdir, mkdtemp, readdir, rename, rm } from 'node:fs/promises'
import { join } from 'node:path'

const state = '/var/lib/polymoly-live'
const destination = '/var/backups/polymoly-data'
const retentionMs = 7 * 24 * 60 * 60 * 1000
process.umask(0o077)
await mkdir(destination, { recursive: true, mode: 0o700 })
const staging = await mkdtemp(join(destination, '.snapshot-'))

try {
  for (const name of ['catalog.sqlite', 'catalog.sqlite.admin.sqlite']) {
    let database
    try {
      database = new DatabaseSync(join(state, name), { readOnly: true })
    } catch (error) {
      if (name.endsWith('.admin.sqlite')) {
        const absent = await access(join(state, name)).then(() => false, error => error.code === 'ENOENT')
        if (absent) continue
      }
      throw error
    }
    const snapshot = join(staging, name)
    try { await backup(database, snapshot) } finally { database.close() }
    const copy = new DatabaseSync(snapshot, { readOnly: true })
    try {
      if (copy.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') {
        throw new Error(`Integrity check failed for ${name}`)
      }
    } finally { copy.close() }
  }
  const completed = new Date().toISOString()
  await rename(staging, join(destination, completed))
  for (const entry of await readdir(destination, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(entry.name)) continue
    if (Date.now() - Date.parse(entry.name) > retentionMs) {
      await rm(join(destination, entry.name), { recursive: true })
    }
  }
  console.log(`Verified SQLite backup: ${completed}`)
} finally {
  await rm(staging, { recursive: true, force: true })
}
