import { createServer } from 'node:http'

const host = process.env.HOST || '0.0.0.0'
const port = Number(process.env.PORT || 8000)

const server = createServer((req, res) => {
  const path = req.url || '/'
  console.log(`[local-server] ${req.method} ${path}`)

  const origin = req.headers.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'GET' && path === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, endpoint: '/transcript' }))
    return
  }

  if (req.method === 'GET' && path === '/favicon.ico') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'POST' && path === '/transcript') {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf-8')
      let parsed
      try {
        parsed = JSON.parse(raw)
      } catch {
        parsed = raw
      }

      console.log('=== transcript received ===')
      console.log({
        path,
        receivedAt: new Date().toISOString(),
        body: parsed,
      })

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))
    })
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ ok: false, message: 'Not Found' }))
})

server.listen(port, host, () => {
  console.log(`[local-server] listening on http://${host}:${port}`)
  console.log('[local-server] endpoint: POST /transcript')
})

