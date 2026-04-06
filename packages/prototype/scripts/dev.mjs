import http from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SRC_ROOT = path.resolve(__dirname, '../src')
const PORT = Number(process.env.PORT || 5175)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
}

function kebabToCamel(input) {
  return input.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
}

function parseIncludeAttributes(raw) {
  const attrs = {}
  const re = /([a-zA-Z0-9:-]+)\s*=\s*"([^"]*)"/g
  let m = re.exec(raw)
  while (m) {
    attrs[m[1]] = m[2]
    m = re.exec(raw)
  }
  return attrs
}

function resolveWithinRoot(candidatePath) {
  const resolved = path.resolve(candidatePath)
  if (!resolved.startsWith(SRC_ROOT + path.sep) && resolved !== SRC_ROOT) {
    return null
  }
  return resolved
}

async function fileExists(p) {
  try {
    const s = await stat(p)
    return s.isFile()
  } catch {
    return false
  }
}

async function dirExists(p) {
  try {
    const s = await stat(p)
    return s.isDirectory()
  } catch {
    return false
  }
}

async function resolveRequestToFile(requestPath) {
  const decoded = decodeURIComponent(requestPath)
  const withoutQuery = decoded.split('?')[0].split('#')[0]
  const rel = withoutQuery.startsWith('/') ? withoutQuery.slice(1) : withoutQuery

  const base = resolveWithinRoot(path.join(SRC_ROOT, rel))
  if (!base) return null

  if (await fileExists(base)) return base

  if (await dirExists(base)) {
    const idx = path.join(base, 'index.html')
    if (await fileExists(idx)) return idx
  }

  if (!path.extname(base)) {
    const asHtml = `${base}.html`
    if (await fileExists(asHtml)) return asHtml
  }

  return null
}

async function loadHtml(filePath) {
  const raw = await readFile(filePath, 'utf8')
  return await expandIncludes(raw, path.dirname(filePath), 0)
}

async function expandIncludes(html, contextDir, depth) {
  if (depth > 20) return html
  const re = /<include\b([^>]*)><\/include>/g

  const parts = []
  let lastIndex = 0
  let match = re.exec(html)
  while (match) {
    parts.push(html.slice(lastIndex, match.index))
    lastIndex = match.index + match[0].length

    const attrs = parseIncludeAttributes(match[1] || '')
    const src = attrs.src
    if (!src) {
      parts.push('')
      match = re.exec(html)
      continue
    }

    const includePathRaw = src.startsWith('/')
      ? path.join(SRC_ROOT, src.slice(1))
      : path.join(contextDir, src)
    const includePath = resolveWithinRoot(includePathRaw)
    if (!includePath) {
      parts.push('')
      match = re.exec(html)
      continue
    }

    let fragment = await readFile(includePath, 'utf8')

    const dataProps = Object.entries(attrs)
      .filter(([k]) => k.startsWith('data-'))
      .reduce((acc, [k, v]) => {
        const key = kebabToCamel(k.slice('data-'.length))
        acc[key] = v
        return acc
      }, {})

    for (const [k, v] of Object.entries(dataProps)) {
      fragment = fragment.replaceAll(`{{${k}}}`, v)
    }

    const expanded = await expandIncludes(fragment, path.dirname(includePath), depth + 1)
    parts.push(expanded)
    match = re.exec(html)
  }

  parts.push(html.slice(lastIndex))
  return parts.join('')
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || `localhost:${PORT}`}`)
    const filePath = await resolveRequestToFile(url.pathname)

    if (!filePath) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' })
      res.end('未找到')
      return
    }

    const ext = path.extname(filePath)
    const contentType = MIME[ext] || 'application/octet-stream'

    if (ext === '.html') {
      const html = await loadHtml(filePath)
      res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store' })
      res.end(html)
      return
    }

    const buf = await readFile(filePath)
    res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store' })
    res.end(buf)
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' })
    res.end('服务异常')
  }
})

server.listen(PORT, () => {
  process.stdout.write(`原型服务已启动：http://localhost:${PORT}/\n`)
})
