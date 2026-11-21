import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const nextBin = require.resolve('next/dist/bin/next')
const port = '3187'
const origin = `http://127.0.0.1:${port}`
const directory = mkdtempSync(join(tmpdir(), 'polymoly-next-'))
const server = spawn(process.execPath, [nextBin, 'start', '--hostname', '127.0.0.1', '--port', port], {
  env: { ...process.env, SITE_INDEXABLE: 'false', POLYMOLY_DATABASE_FILE: join(directory, 'catalog.sqlite'), NEXT_TELEMETRY_DISABLED: '1', ADMIN_PASSWORD_HASH: '' },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let output = ''
server.stdout.on('data', chunk => { output = (output + chunk).slice(-12000) })
server.stderr.on('data', chunk => { output = (output + chunk).slice(-12000) })
try {
  let ready = false
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(`Next.js exited early: ${output}`)
    try {
      const response = await fetch(`${origin}/healthz`, { signal: AbortSignal.timeout(1000) })
      if (response.ok) { ready = true; break }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 300))
  }
  assert.ok(ready, `Next.js did not start: ${output}`)
  const home = await fetch(origin)
  assert.equal(home.status, 200)
  const html = await home.text()
  assert.match(html, /lang="fa"/)
  assert.match(html, /dir="rtl"/)
  assert.match(html, /noindex/)
  const slugs = [...new Set([...html.matchAll(/href="\/products\/([^"?#]+)"/g)].map(match => match[1]))]
  assert.equal(slugs.length, 9, 'All official products must have server-rendered links')
  const api = await fetch(`${origin}/api/products`)
  assert.equal(api.status, 200)
  assert.equal(api.headers.get('cache-control'), 'no-store')
  assert.equal((await api.json()).products.length, 9)
  for (const slug of slugs) {
    const response = await fetch(`${origin}/products/${slug}`)
    assert.equal(response.status, 200, slug)
    const productHtml = await response.text()
    assert.match(productHtml, /<h1>/)
    assert.match(productHtml, new RegExp(`rel="canonical" href="https://polymoly.ir/products/${slug}"`))
    const image = productHtml.match(/src="(\/products\/[^"?]+\.jpg)"/)
    assert.ok(image, `Product image missing: ${slug}`)
    assert.equal((await fetch(`${origin}${image[1]}`)).status, 200)
    const detail = await fetch(`${origin}/api/products/${slug}`)
    assert.equal(detail.status, 200)
    assert.equal((await detail.json()).product.id, slug)
  }
  assert.equal((await fetch(`${origin}/products/not-a-product`)).status, 404)
  assert.equal((await fetch(`${origin}/api/products/not-a-product`)).status, 404)
  assert.equal((await fetch(`${origin}/api/products`, { method: 'POST' })).status, 405)
  const admin = await fetch(`${origin}/admin`)
  assert.equal(admin.status, 200)
  assert.match(await admin.text(), /noindex/)
  assert.equal((await fetch(`${origin}/api/admin/products`)).status, 503)
  assert.deepEqual(await (await fetch(`${origin}/healthz`)).json(), { status: 'ok', service: 'polymoly' })
  assert.match(await (await fetch(`${origin}/robots.txt`)).text(), /Disallow: \//)
  assert.doesNotMatch(await (await fetch(`${origin}/sitemap.xml`)).text(), /<loc>/)
  console.log('Next.js smoke checks passed: catalog HTML, metadata, images, 404, health and launch indexing gate.')
} catch (error) {
  console.error(output)
  throw error
} finally {
  const stopped = new Promise(resolve => server.once('close', resolve))
  server.kill()
  if (server.exitCode === null) await stopped
  rmSync(directory, { recursive: true, force: true })
}
