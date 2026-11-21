import { spawnSync, execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const outputDirectory = join(root, 'outputs')
mkdirSync(outputDirectory, { recursive: true })
const archive = join(outputDirectory, 'polymoly-preview-source.tar.gz')
const paths = ['package.json', 'package-lock.json', 'next.config.ts', 'next-env.d.ts', 'tsconfig.json', 'src', 'server', 'public', 'scripts', 'deploy/install-preview.sh']
for (const path of paths) if (!existsSync(join(root, path))) throw new Error(`Missing source: ${path}`)
function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} exited with ${result.status}`)
}
run('tar', ['-czf', archive, '--exclude', '.env*', '--exclude', '*.sqlite*', '--exclude', 'node_modules', '--exclude', '.git', '-C', root, ...paths])
const entries = execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' }).trim().split(/\r?\n/)
if (entries.some(path => path.startsWith('/') || path.split('/').includes('..') || /(^|\/)(\.env[^/]*|\.git|node_modules)(\/|$)|\.sqlite/.test(path))) throw new Error('Archive contains an excluded or unsafe path')
const checksum = createHash('sha256').update(readFileSync(archive)).digest('hex')
console.log(`Source archive: ${archive}\nSHA-256: ${checksum}`)
if (process.argv.includes('--pack-only')) process.exit(0)
const target = 'root@94.184.36.186'
console.log('Enter the server password only at the SSH/SCP prompt. Do not share it in chat.')
run('scp', ['-o', 'StrictHostKeyChecking=yes', '-o', 'ConnectTimeout=15', archive, `${target}:/root/polymoly-preview-source.tar.gz`])
const remoteArchive = '/root/polymoly-preview-source.tar.gz'
// All interpolated values below are fixed paths or the locally computed hex digest.
const remote = `echo '${checksum}  ${remoteArchive}' | sha256sum --check - && install_dir=$(mktemp -d /root/polymoly-preview-install.XXXXXX) && tar --no-same-owner -xzf '${remoteArchive}' -C "$install_dir" && bash "$install_dir/deploy/install-preview.sh"; exec bash`
console.log('When installation reports ready, open http://127.0.0.1:3190 and keep this SSH window open.')
run('ssh', ['-tt', '-o', 'StrictHostKeyChecking=yes', '-o', 'ConnectTimeout=15', '-o', 'ExitOnForwardFailure=yes', '-L', '127.0.0.1:3190:127.0.0.1:3190', target, remote])
