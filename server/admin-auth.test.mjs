import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { hashAdminPassword, verifyAdminPassword, openAdminStore, readAdminConfig, SESSION_SECONDS } from './admin-auth.mjs'

test('scrypt password hashes verify only the correct password and enforce minimum strength', async () => {
  const password = 'a-test-password-of-24-chars'
  const hash = await hashAdminPassword(password)
  assert.ok(!hash.includes(password))
  assert.equal(await verifyAdminPassword(password, hash), true)
  assert.equal(await verifyAdminPassword('incorrect-password', hash), false)
  assert.equal(await verifyAdminPassword(password, 'bad-format'), false)
  await assert.rejects(hashAdminPassword('short'))
})

test('sessions survive reopen, store token hashes, expire and support revocation and password rotation', () => {
  const directory = mkdtempSync(join(tmpdir(), 'polymoly-auth-'))
  const filename = join(directory, 'auth.sqlite')
  let store
  try {
    store = openAdminStore(filename)
    const token = store.createSession('credential-v1', 1000)
    assert.match(token, /^[a-f0-9]{64}$/)
    const reader = new DatabaseSync(filename)
    try { assert.notEqual(reader.prepare('SELECT token_hash FROM admin_sessions').get().token_hash, token) } finally { reader.close() }
    store.close(); store = openAdminStore(filename)
    assert.equal(store.isAuthenticated(token, 'credential-v1', 1001), true)
    assert.equal(store.isAuthenticated(token, 'credential-v2', 1001), false)
    assert.equal(store.isAuthenticated(token, 'credential-v1', 1000 + SESSION_SECONDS * 1000), false)
    assert.equal(store.isAuthenticated('forged', 'credential-v1', 1001), false)
    store.destroySession(token)
    assert.equal(store.isAuthenticated(token, 'credential-v1', 1001), false)
  } finally { store?.close(); rmSync(directory, { recursive: true, force: true }) }
})

test('login throttling survives process restart and resets after the window', () => {
  const directory = mkdtempSync(join(tmpdir(), 'polymoly-limit-'))
  const filename = join(directory, 'auth.sqlite')
  let store
  try {
    store = openAdminStore(filename)
    for (let i = 0; i < 5; i++) assert.equal(store.allowLoginAttempt(1000), true)
    store.close(); store = openAdminStore(filename)
    assert.equal(store.allowLoginAttempt(1001), false)
    assert.equal(store.allowLoginAttempt(1000 + 15 * 60 * 1000), true)
  } finally { store?.close(); rmSync(directory, { recursive: true, force: true }) }
})

test('admin configuration fails closed without credentials and rejects insecure production origins', () => {
  const previous = { hash: process.env.ADMIN_PASSWORD_HASH, origin: process.env.ADMIN_ORIGIN, mode: process.env.NODE_ENV }
  try {
    delete process.env.ADMIN_PASSWORD_HASH
    assert.throws(() => readAdminConfig())
    process.env.ADMIN_PASSWORD_HASH = `scrypt$${'a'.repeat(32)}$${'b'.repeat(128)}`
    process.env.NODE_ENV = 'production'; process.env.ADMIN_ORIGIN = 'http://polymoly.ir'
    assert.throws(() => readAdminConfig())
    process.env.ADMIN_ORIGIN = 'https://polymoly.ir'
    assert.equal(readAdminConfig().secure, true)
    assert.equal(readAdminConfig().cookieName, '__Host-polymoly_admin')
    process.env.ADMIN_ORIGIN = 'https://polymoly.ir/other'
    assert.throws(() => readAdminConfig())
    process.env.NODE_ENV = 'development'; process.env.ADMIN_ORIGIN = 'http://localhost:3000'
    assert.equal(readAdminConfig().secure, false)
  } finally {
    for (const [name, value] of [['ADMIN_PASSWORD_HASH', previous.hash], ['ADMIN_ORIGIN', previous.origin], ['NODE_ENV', previous.mode]]) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value
    }
  }
})
