import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compile } from './build.mjs'

const project = fileURLToPath(new URL('..', import.meta.url))
const built = process.argv.includes('--dist')
const root = resolve(project, built ? 'dist' : '.')
const portIndex = process.argv.indexOf('--port')
const port = portIndex < 0 ? 5173 : Number(process.argv[portIndex + 1])
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' }

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost')
    const pathname = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)
    const ext = extname(pathname)
    const source = !built && ext === '.js'
    if (pathname !== '/index.html' && !pathname.startsWith('/src/')) throw new Error()
    const path = resolve(root, '.' + (source ? pathname.replace(/\.js$/, '.ts') : pathname))
    if (!path.startsWith(root + sep) || !mime[ext]) throw new Error()
    const body = await readFile(path, 'utf8')
    res.writeHead(200, { 'Content-Type': mime[ext] + '; charset=utf-8', 'Cache-Control': 'no-store' })
    res.end(source ? compile(body) : body)
  } catch {
    res.writeHead(404).end()
  }
}).listen(port, '127.0.0.1', () => console.log('Производственное планирование · http://127.0.0.1:' + port))
