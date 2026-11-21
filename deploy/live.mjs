import { spawnSync, execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const output = join(root, 'outputs')
mkdirSync(output, { recursive: true })
const archive = join(output, 'polymoly-live-source.tar.gz')
const paths = ['package.json', 'package-lock.json', 'next.config.ts', 'next-env.d.ts', 'tsconfig.json', 'src', 'server', 'public', 'scripts', 'deploy/install-live.sh', 'deploy/wait-for-app.sh']
for (const path of paths) if (!existsSync(join(root, path))) throw new Error(`Missing source: ${path}`)
function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} exited with ${result.status}`)
}
run('tar', ['-czf', archive, '--exclude', '.env*', '--exclude', '*.sqlite*', '--exclude', 'node_modules', '--exclude', '.git', '-C', root, ...paths])
const entries = execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' }).trim().split(/\r?\n/)
if (entries.some(path => path.startsWith('/') || path.split('/').includes('..') || /(^|\/)(\.env[^/]*|\.git|node_modules)(\/|$)|\.sqlite/.test(path))) throw new Error('Unsafe archive content')
const checksum = createHash('sha256').update(readFileSync(archive)).digest('hex')
console.log(`Source archive: ${archive}\nSHA-256: ${checksum}`)
if (process.argv.includes('--pack-only')) process.exit(0)
const target = 'root@94.184.36.186'
console.log('This publishes the website at polymoly.ir. Enter credentials only at the SSH/SCP prompt.')
run('scp', ['-o', 'StrictHostKeyChecking=yes', '-o', 'ConnectTimeout=15', archive, `${target}:/root/polymoly-live-source.tar.gz`])
const remoteArchive = '/root/polymoly-live-source.tar.gz'
const remote = `echo '${checksum}  ${remoteArchive}' | sha256sum --check - && install_dir=$(mktemp -d /root/polymoly-live-install.XXXXXX) && tar --no-same-owner -xzf '${remoteArchive}' -C "$install_dir" && bash "$install_dir/deploy/install-live.sh"; exec bash`
run('ssh', ['-tt', '-o', 'StrictHostKeyChecking=yes', '-o', 'ConnectTimeout=15', target, remote])
