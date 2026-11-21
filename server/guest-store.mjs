import { createHash, randomBytes } from 'node:crypto'

const digest = token => createHash('sha256').update(token).digest('hex')
const valid = token => typeof token === 'string' && /^[a-f0-9]{64}$/.test(token)
export const GUEST_SECONDS = 24 * 60 * 60

export function createGuestStorage(db, now = Date.now) {
  db.exec(`CREATE TABLE IF NOT EXISTS checkout_sessions (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS checkout_limits (bucket TEXT PRIMARY KEY, attempts INTEGER NOT NULL, reset_at INTEGER NOT NULL);`)
  return {
    createGuestSession() {
      const timestamp = now()
      db.prepare('DELETE FROM checkout_sessions WHERE expires_at <= ?').run(timestamp)
      const token = randomBytes(32).toString('hex')
      db.prepare('INSERT INTO checkout_sessions VALUES (?, ?)').run(digest(token), timestamp + GUEST_SECONDS * 1000)
      return token
    },
    isGuestSession(token) {
      return valid(token) && !!db.prepare('SELECT 1 FROM checkout_sessions WHERE token_hash = ? AND expires_at > ?').get(digest(token), now())
    },
    allowCheckoutAttempt(bucket, limit) {
      const timestamp = now()
      db.exec('BEGIN IMMEDIATE')
      try {
        db.prepare('DELETE FROM checkout_limits WHERE reset_at <= ?').run(timestamp)
        const record = db.prepare('SELECT attempts FROM checkout_limits WHERE bucket = ?').get(bucket)
        if (record && record.attempts >= limit) { db.exec('COMMIT'); return false }
        db.prepare('INSERT INTO checkout_limits VALUES (?, 1, ?) ON CONFLICT(bucket) DO UPDATE SET attempts = attempts + 1').run(bucket, timestamp + 15 * 60 * 1000)
        db.exec('COMMIT'); return true
      } catch (error) { db.exec('ROLLBACK'); throw error }
    },
  }
}
