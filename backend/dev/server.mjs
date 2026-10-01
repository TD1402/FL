/**
 * Server dev giả lập Web App Apps Script tại http://localhost:8787/exec
 *   node dev/server.mjs          (dữ liệu lưu ở dev/data/db.json)
 *   node dev/server.mjs --reset  (xoá dữ liệu, chạy lại setup())
 *
 * Giống GAS thật: không hỗ trợ preflight OPTIONS → frontend phải gửi POST dạng text/plain.
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createGas } from './gas-emulator.mjs'

const PORT = Number(process.env.PORT || 8787)
const DATA_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data', 'db.json')

if (process.argv.includes('--reset') && fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE)
const gas = createGas({ dataFile: DATA_FILE })
if (!gas.isSetup()) {
  gas.run('setup')
  console.log('Đã chạy setup() với dữ liệu mẫu.')
}

const cors = { 'Access-Control-Allow-Origin': '*' }

http
  .createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`)

    if (url.pathname.startsWith('/uploads/')) {
      const file = gas.uploads[url.pathname.slice(9)]
      if (!file) return res.writeHead(404).end()
      return res.writeHead(200, { 'Content-Type': file.mime, ...cors }).end(file.buffer)
    }
    if (url.pathname !== '/exec') return res.writeHead(404, cors).end('Not found')
    if (req.method === 'OPTIONS') return res.writeHead(405).end() // GAS không hỗ trợ preflight

    const send = (json) => {
      // Dev: trả URL ảnh upload về server local thay vì lh3.googleusercontent.com
      if (json.success && json.data && json.data.url && json.data.id && gas.uploads[json.data.id]) {
        json.data.url = `http://localhost:${PORT}/uploads/${json.data.id}`
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', ...cors })
      res.end(JSON.stringify(json))
    }

    if (req.method === 'GET') return send(gas.get(Object.fromEntries(url.searchParams)))
    if (req.method === 'POST') {
      let body = ''
      req.on('data', (c) => (body += c))
      req.on('end', () => {
        const json = gas.post(body)
        const action = (() => { try { return JSON.parse(body).action } catch { return '?' } })()
        console.log(`POST ${action} → ${json.success ? 'ok' : json.error}`)
        send(json)
      })
      return
    }
    res.writeHead(405, cors).end()
  })
  .listen(PORT, () => console.log(`GAS dev server: http://localhost:${PORT}/exec`))
