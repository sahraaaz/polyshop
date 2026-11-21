import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

async function exercise(reply) {
  const directory = mkdtempSync(join(tmpdir(), 'polymoly-readiness-'))
  let requests = 0
  const server = createServer((_request, response) => {
    const result = reply(++requests)
    response.writeHead(result.status, { 'Content-Type': 'text/plain' }); response.end(result.body)
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    const script = fileURLToPath(new URL('./wait-for-app.sh', import.meta.url))
    const child = spawn('bash', [script, process.execPath, 'Regression health', directory, '--noproxy', '*', `http://127.0.0.1:${server.address().port}/healthz`], {
      env: { ...process.env, POLYMOLY_HEALTH_ATTEMPTS: '3', POLYMOLY_HEALTH_DELAY: '0' },
    })
    let output = ''
    child.stdout.on('data', chunk => { output += chunk })
    child.stderr.on('data', chunk => { output += chunk })
    const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('close', resolve) })
    return { code, output, requests, body: readFileSync(join(directory, 'body'), 'utf8') }
  } finally { await new Promise(resolve => server.close(resolve)); rmSync(directory, { recursive: true, force: true }) }
}
test('old plain-ok responses during reload are retried until the real app responds', async () => {
  const result = await exercise(attempt => ({ status: 200, body: attempt < 3 ? 'ok\n' : '{"status":"ok","service":"polymoly"}' }))
  assert.equal(result.code, 0); assert.equal(result.requests, 3)
  assert.match(result.output, /verified \(attempt 3/)
})
test('a permanent old launch response is rejected and preserved for diagnosis', async () => {
  const result = await exercise(() => ({ status: 200, body: 'ok\n' }))
  assert.equal(result.code, 1); assert.equal(result.requests, 3)
  assert.match(result.output, /Last HTTP status: 200/); assert.equal(result.body, 'ok\n')
})
test('temporary upstream errors recover without weakening application identity checks', async () => {
  const result = await exercise(attempt => attempt < 2 ? { status: 502, body: 'upstream unavailable' } : { status: 200, body: '{"status":"ok","service":"polymoly"}' })
  assert.equal(result.code, 0); assert.equal(result.requests, 2)
})
test('HTTP 200 from an unrelated service never satisfies readiness', async () => {
  const result = await exercise(() => ({ status: 200, body: '{"status":"ok","service":"another-app"}' }))
  assert.equal(result.code, 1); assert.equal(result.requests, 3)
})
