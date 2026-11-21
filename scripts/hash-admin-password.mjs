import { hashAdminPassword } from '../server/admin-auth.mjs'

async function readPassword() {
  if (!process.stdin.isTTY) {
    let value = ''
    for await (const chunk of process.stdin) {
      value += chunk
      if (value.length > 258) throw new Error('Password is too long')
    }
    return value.replace(/\r?\n$/, '')
  }
  process.stderr.write('Admin password (16–256 characters, hidden): ')
  process.stdin.setEncoding('utf8'); process.stdin.setRawMode(true); process.stdin.resume()
  return new Promise((resolve, reject) => {
    let value = ''
    function finish(error) {
      process.stdin.off('data', onData); process.stdin.setRawMode(false); process.stdin.pause(); process.stderr.write('\n')
      if (error) reject(error); else resolve(value)
    }
    function onData(chunk) {
      for (const char of chunk) {
        if (char === '\u0003') return finish(new Error('Cancelled'))
        if (char === '\r' || char === '\n') return finish()
        if (char === '\u007f' || char === '\b') value = Array.from(value).slice(0, -1).join('')
        else if (char >= ' ') value += char
        if (value.length > 256) return finish(new Error('Password is too long'))
      }
    }
    process.stdin.on('data', onData)
  })
}
try { console.log(await hashAdminPassword(await readPassword())) }
catch (error) { console.error(error.message); process.exitCode = 1 }
