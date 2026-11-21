import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto'
import { promisify } from 'node:util'
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const scrypt = promisify(scryptCallback)
const scryptOptions = { N: 131072, r: 8, p: 1, maxmem: 192 * 1024 * 1024 }
export const SESSION_SECONDS = 8 * 60 * 60
export const passwordHashPattern = /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/
const validToken = token => typeof token === 'string' && /^[a-f0-9]{64}$/.test(token)
const digest = value => createHash('sha256').update(value).digest('hex')

export async function hashAdminPassword(password) {
  if (typeof password !== 'string' || password.length < 16 || password.length > 256) throw new Error('Use a password of 16 to 256 characters')
  const salt = randomBytes(16).toString('hex')
  const key = await scrypt(password, Buffer.from(salt, 'hex'), 64, scryptOptions)
  return `scrypt$${salt}$${key.toString('hex')}`
}

export async function verifyAdminPassword(password, encoded) {
  if (!passwordHashPattern.test(encoded) || typeof password !== 'string' || password.length > 256) return false
  const [, salt, expected] = encoded.split('$')
  const actual = await scrypt(password, Buffer.from(salt, 'hex'), 64, scryptOptions)
  return timingSafeEqual(actual, Buffer.from(expected, 'hex'))
}

export function readAdminConfig() {
  const passwordHash = process.env.ADMIN_PASSWORD_HASH || ''
  if (!passwordHashPattern.test(passwordHash)) throw new Error('Administrator credentials are not configured')
  const origin = new URL(process.env.ADMIN_ORIGIN || 'https://polymoly.ir')
  const secure = origin.protocol === 'https:'
  if (origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash || (!secure && !(process.env.NODE_ENV !== 'production' && origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname)))) {
    throw new Error('Invalid administrator origin')
  }
  return { passwordHash, origin: origin.origin, secure, cookieName: secure ? '__Host-polymoly_admin' : 'polymoly_admin_dev' }
}

export function openAdminStore(filename) {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true })
  const db = new DatabaseSync(filename)
  try {
    db.exec('PRAGMA busy_timeout = 5000;')
    if (filename !== ':memory:') db.exec('PRAGMA journal_mode = WAL;')
    const version = Number(db.prepare('PRAGMA user_version').get().user_version)
    if (version > 1) throw new Error('Unsupported administrator schema version')
    db.exec(`CREATE TABLE IF NOT EXISTS admin_sessions (token_hash TEXT PRIMARY KEY, credential_hash TEXT NOT NULL, expires_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS admin_login_limit (id INTEGER PRIMARY KEY CHECK(id = 1), attempts INTEGER NOT NULL, reset_at INTEGER NOT NULL);
      PRAGMA user_version = 1;`)
    return {
      // Global persistent throttle: do not trust client-supplied IP headers.
      allowLoginAttempt(now = Date.now()) {
        db.exec('BEGIN IMMEDIATE')
        try {
          const bucket = db.prepare('SELECT * FROM admin_login_limit WHERE id = 1').get()
          if (bucket && bucket.reset_at > now && bucket.attempts >= 5) { db.exec('COMMIT'); return false }
          if (!bucket || bucket.reset_at <= now) db.prepare('INSERT OR REPLACE INTO admin_login_limit VALUES (1, 1, ?)').run(now + 15 * 60 * 1000)
          else db.prepare('UPDATE admin_login_limit SET attempts = attempts + 1 WHERE id = 1').run()
          db.exec('COMMIT'); return true
        } catch (error) { db.exec('ROLLBACK'); throw error }
      },
      createSession(passwordHash, now = Date.now()) {
        const credential = digest(passwordHash)
        db.prepare('DELETE FROM admin_sessions WHERE expires_at <= ? OR credential_hash != ?').run(now, credential)
        const token = randomBytes(32).toString('hex')
        db.prepare('INSERT INTO admin_sessions VALUES (?, ?, ?)').run(digest(token), credential, now + SESSION_SECONDS * 1000)
        return token
      },
      isAuthenticated(token, passwordHash, now = Date.now()) {
        if (!validToken(token)) return false
        return !!db.prepare('SELECT 1 FROM admin_sessions WHERE token_hash = ? AND credential_hash = ? AND expires_at > ?').get(digest(token), digest(passwordHash), now)
      },
      destroySession(token) { if (validToken(token)) db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(digest(token)) },
      close: () => db.close(),
    }
  } catch (error) { db.close(); throw error }
}
