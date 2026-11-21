import assert from 'node:assert/strict'
import { createServer } from 'node:https'
import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { hashAdminPassword } from '../server/admin-auth.mjs'
import { catalogSeed } from '../src/data/catalog-seed.js'

const candidates = [process.env.CHROME_PATH, 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean)
const executablePath = candidates.find(path => existsSync(path))
assert.ok(executablePath, 'Set CHROME_PATH to an installed Chrome/Chromium executable.')
const directory = mkdtempSync(join(tmpdir(), 'polymoly-browser-'))
const origin = 'https://127.0.0.1:3443'
const password = randomBytes(24).toString('hex')
const openssl = process.platform === 'win32' ? 'C:\\Program Files\\Git\\mingw64\\bin\\openssl.exe' : 'openssl'
let app, server, browser
try {
  execFileSync(openssl, ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', join(directory, 'key.pem'), '-out', join(directory, 'cert.pem'), '-days', '1', '-subj', '/CN=127.0.0.1', '-addext', 'subjectAltName=IP:127.0.0.1'], { stdio: 'ignore' })
  Object.assign(process.env, {
    NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', SITE_INDEXABLE: 'false',
    CHECKOUT_ENABLED: 'true', CHECKOUT_ORIGIN: origin, ADMIN_ORIGIN: origin,
    ADMIN_PASSWORD_HASH: await hashAdminPassword(password), POLYMOLY_DATABASE_FILE: join(directory, 'catalog.sqlite'),
  })
  const next = (await import('next')).default
  const { chromium } = await import('playwright-core')
  app = next({ dev: false, hostname: '127.0.0.1', port: 3443 })
  await app.prepare()
  server = createServer({ key: readFileSync(join(directory, 'key.pem')), cert: readFileSync(join(directory, 'cert.pem')) }, app.getRequestHandler())
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(3443, '127.0.0.1', resolve) })
  browser = await chromium.launch({ executablePath, headless: true, args: ['--disable-background-networking'] })
  const context = await browser.newContext({ ignoreHTTPSErrors: true })
  // Keep this test local; external fonts and all third-party requests are blocked.
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort())
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${origin}/admin`)
  await page.getByLabel('رمز ورود', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'ورود', exact: true }).click()
  await page.getByRole('button', { name: 'افزودن محصول', exact: true }).waitFor()
  await page.getByRole('button', { name: 'ویرایش', exact: true }).first().click()
  await page.getByLabel('قیمت به تومان', { exact: true }).fill('123000')
  await page.getByLabel('موجودی قابل فروش', { exact: true }).fill('3')
  await page.getByLabel('تخفیف درصدی', { exact: true }).fill('0')
  await page.getByRole('button', { name: 'ذخیرهٔ محصول', exact: true }).click()
  await page.getByText('محصول ذخیره شد.', { exact: true }).waitFor()
  await page.goto(`${origin}/checkout`)
  await page.getByRole('button', { name: catalogSeed[0].title, exact: true }).waitFor({ state: 'visible' })
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => !button.disabled && button.textContent?.includes('Class of 1401')))
  await page.getByRole('button', { name: catalogSeed[0].title, exact: true }).click()
  await page.getByLabel('تعداد', { exact: true }).fill('2')
  await page.getByRole('button', { name: 'رزرو ۱۵دقیقه‌ای کالاها', exact: true }).click()
  await page.getByRole('heading', { name: 'رسید رزرو', exact: true }).waitFor()
  assert.ok((await page.getByText('مبلغ محاسبه‌شدهٔ سرور:', { exact: false }).textContent()).includes((246000).toLocaleString('fa-IR')))
  await page.reload()
  await page.getByRole('heading', { name: 'رسید رزرو', exact: true }).waitFor()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'لغو رزرو و آزادکردن کالا', exact: true }).click()
  await page.getByText('لغوشده', { exact: true }).waitFor()
  await page.goto(origin)
  await page.locator('header').first().waitFor()
  assert.deepEqual(errors, [], 'Client JavaScript errors occurred')
  console.log('Browser checks passed: admin form, guest cart/receipt/reload/cancel, mobile receipt and legacy home hydration.')
} finally {
  await browser?.close()
  if (server?.listening) {
    server.closeAllConnections()
    await new Promise(resolve => server.close(resolve))
  }
  await app?.close()
  for (const key of ['polymoly.catalog-store.v1', 'polymoly.admin-store.v1']) {
    const record = globalThis[Symbol.for(key)]
    try { record?.store.close() } catch {}
    delete globalThis[Symbol.for(key)]
  }
  rmSync(directory, { recursive: true, force: true })
}
