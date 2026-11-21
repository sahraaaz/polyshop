import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'

const require = createRequire(import.meta.url)
const building = process.argv.includes('--build')
const failures = []
const major = Number(process.versions.node.split('.')[0])
if (major !== 24) failures.push(`Use Node 24 LTS; found ${process.versions.node}.`)
try {
  const { DatabaseSync } = await import('node:sqlite')
  const db = new DatabaseSync(':memory:')
  db.prepare('SELECT 1').get(); db.close()
} catch { failures.push('The Node runtime must provide node:sqlite.') }

function metadata(name) {
  try { return JSON.parse(readFileSync(require.resolve(`${name}/package.json`), 'utf8')) }
  catch { failures.push(`${name}: package metadata is missing or incomplete.`); return null }
}
function entry(name) {
  try { require.resolve(name) }
  catch { failures.push(`${name}: package entry point is missing.`) }
}
const next = metadata('next')
if (next && next.version !== '16.4.6') failures.push(`Expected Next.js 16.4.6; found ${next.version}.`)
if (next) { entry('next/dist/bin/next'); entry('next/dist/server/next') }
const react = metadata('react'), reactDom = metadata('react-dom')
if (react && reactDom && (react.version !== reactDom.version || !react.version.startsWith('19.'))) failures.push('React and react-dom must use the same React 19 version.')
entry('react'); entry('react-dom')
if (building) {
  metadata('typescript'); entry('typescript/lib/tsc.js')
  metadata('@types/react'); metadata('@types/react-dom'); metadata('@types/node')
}
try {
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'))
  const declared = manifest.dependencies?.next
  if (declared !== '16.4.6' || lock.packages?.['node_modules/next']?.version !== declared || lock.packages?.['']?.dependencies?.next !== declared) {
    failures.push('Next.js must be declared and locked at 16.4.6 before verification/deployment; installation has not been finalized.')
  }
} catch { failures.push('A readable package.json and package-lock.json are required.') }

if (failures.length) {
  console.error('Next.js runtime is not ready:')
  for (const failure of failures) console.error(`- ${failure}`)
  console.error('Do not deploy the partial install. Complete authorized dependency installation and commit the generated manifest/lockfile before retrying.')
  process.exitCode = 1
} else console.log(`Next.js ${building ? 'build' : 'runtime'} prerequisites passed. This check does not replace a build, type check or runtime smoke test.`)
