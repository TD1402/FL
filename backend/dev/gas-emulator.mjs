/**
 * Giả lập tối giản môi trường Google Apps Script để chạy các file .gs trên Node
 * (chỉ dùng cho dev/test — KHÔNG deploy). Mô phỏng hành vi quan trọng của Sheets:
 * chuỗi bắt đầu bằng ' được giữ dạng text, chuỗi trông như số bị tự đổi thành số.
 */
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const BACKEND_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TZ = 'Asia/Ho_Chi_Minh'

function toSigned(buf) {
  return Array.from(buf, (b) => (b > 127 ? b - 256 : b))
}

function formatDate(date, tz, fmt) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: tz || TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  )
  const map = {
    yyyy: parts.year,
    yy: parts.year.slice(2),
    MM: parts.month,
    dd: parts.day,
    HH: parts.hour,
    H: String(Number(parts.hour)),
    mm: parts.minute,
    m: String(Number(parts.minute)),
    ss: parts.second,
  }
  return fmt.replace(/'[^']*'|yyyy|yy|MM|dd|HH|H|mm|m|ss/g, (t) => (t[0] === "'" ? t.slice(1, -1) : map[t]))
}

/** Mô phỏng cách Sheets lưu một giá trị khi ghi vào ô. */
function storeCell(v) {
  if (typeof v === 'string') {
    if (v.startsWith("'")) return v.slice(1)
    if (/^-?\d+(\.\d+)?$/.test(v.trim()) && v.trim() !== '') return Number(v)
    if (/^(true|false)$/i.test(v)) return v.toLowerCase() === 'true'
  }
  return v
}

export function createGas({ dataFile } = {}) {
  let db = { sheets: {}, props: {} }
  if (dataFile && fs.existsSync(dataFile)) db = JSON.parse(fs.readFileSync(dataFile, 'utf8'))
  const save = () => {
    if (!dataFile) return
    fs.mkdirSync(path.dirname(dataFile), { recursive: true })
    fs.writeFileSync(dataFile, JSON.stringify(db))
  }

  const mails = []
  const fetches = []
  const uploads = {}
  /* Drive giả lập: cây thư mục trong bộ nhớ. Thư mục gốc dùng mọi ID được yêu cầu lần đầu. */
  const driveFolders = new Map() // id → { id, name, parent }
  /** Mô phỏng: thư mục gốc đã chia sẻ công khai chưa; setSharing từng file có bị Google từ chối không */
  const driveSettings = { rootSharing: 'PRIVATE', setSharingFails: false }
  const iter = (list) => {
    let i = 0
    return { hasNext: () => i < list.length, next: () => list[i++] }
  }
  function folderApi(id) {
    const f = driveFolders.get(id)
    if (!f) throw new Error('Không tìm thấy thư mục: ' + id)
    return {
      getId: () => f.id,
      getName: () => f.name,
      getParents: () => iter(f.parent ? [folderApi(f.parent)] : []),
      getFolders: () => iter([...driveFolders.values()].filter((x) => x.parent === id).map((x) => folderApi(x.id))),
      getFoldersByName: (name) =>
        iter([...driveFolders.values()].filter((x) => x.parent === id && x.name === name).map((x) => folderApi(x.id))),
      createFolder: (name) => folderApi(addFolder(name, id)),
      getFiles: () => iter(Object.keys(uploads).filter((fid) => uploads[fid].folder === id).map(fileApi)),
      moveTo: (dest) => {
        f.parent = dest.getId()
        return folderApi(id)
      },
      getSharingAccess: () => driveSettings.rootSharing,
      createFile(blob) {
        const fid = crypto.randomUUID().replace(/-/g, '')
        uploads[fid] = {
          buffer: Buffer.from(blob.bytes.map((b) => b & 0xff)),
          mime: blob.mime,
          name: blob.name,
          folder: id,
          created: new Date(),
        }
        return fileApi(fid)
      },
    }
  }
  function fileApi(fid) {
    const u = uploads[fid]
    if (!u) throw new Error('Không tìm thấy file: ' + fid)
    return {
      getId: () => fid,
      getName: () => u.name,
      getMimeType: () => u.mime,
      getDateCreated: () => u.created,
      getParents: () => iter(u.folder ? [folderApi(u.folder)] : []),
      moveTo: (dest) => {
        u.folder = dest.getId()
        return fileApi(fid)
      },
      setSharing: () => {
        if (driveSettings.setSharingFails) throw new Error('Truy cập bị từ chối: DriveApp.')
      },
    }
  }
  function addFolder(name, parent, id = crypto.randomUUID().replace(/-/g, '')) {
    driveFolders.set(id, { id, name, parent })
    return id
  }

  function makeRange(name, row, col, nr = 1, nc = 1) {
    const range = {
      setValues(values) {
        const grid = db.sheets[name]
        for (let i = 0; i < nr; i++) {
          grid[row - 1 + i] = grid[row - 1 + i] || []
          for (let j = 0; j < nc; j++) grid[row - 1 + i][col - 1 + j] = storeCell(values[i][j])
        }
        return range
      },
      setFontWeight: () => range,
      getValues() {
        const grid = db.sheets[name]
        return Array.from({ length: nr }, (_, i) =>
          Array.from({ length: nc }, (_, j) => grid[row - 1 + i]?.[col - 1 + j] ?? ''),
        )
      },
    }
    return range
  }

  function makeSheet(name) {
    const width = () => Math.max(0, ...db.sheets[name].map((r) => r.length))
    const sheet = {
      getName: () => name,
      getLastRow: () => db.sheets[name].length,
      getDataRange: () => makeRange(name, 1, 1, db.sheets[name].length, width()),
      getRange: (r, c, nr, nc) => makeRange(name, r, c, nr, nc),
      appendRow(values) {
        db.sheets[name].push(values.map(storeCell))
        return sheet
      },
      setFrozenRows: () => sheet,
    }
    return sheet
  }

  const spreadsheet = {
    getId: () => 'dev-spreadsheet',
    getName: () => 'Dev Spreadsheet',
    getSheetByName: (n) => (db.sheets[n] ? makeSheet(n) : null),
    insertSheet(n) {
      db.sheets[n] = []
      return makeSheet(n)
    },
    getSheets: () => Object.keys(db.sheets).map(makeSheet),
    deleteSheet: (sh) => delete db.sheets[sh.getName()],
  }

  const cacheStore = new Map()
  const cache = {
    get(k) {
      const e = cacheStore.get(k)
      return e && e.exp > Date.now() ? e.v : null
    },
    put: (k, v, ttl = 600) => cacheStore.set(k, { v: String(v), exp: Date.now() + ttl * 1000 }),
    getAll: (keys) => Object.fromEntries(keys.map((k) => [k, cache.get(k)]).filter(([, v]) => v != null)),
    putAll: (map, ttl) => Object.entries(map).forEach(([k, v]) => cache.put(k, v, ttl)),
    remove: (k) => cacheStore.delete(k),
    removeAll: (keys) => keys.forEach((k) => cacheStore.delete(k)),
  }

  const context = vm.createContext({
    console,
    SpreadsheetApp: {
      getActiveSpreadsheet: () => spreadsheet,
      openById: () => spreadsheet,
      flush: () => {},
    },
    CacheService: { getScriptCache: () => cache },
    LockService: {
      getScriptLock: () => ({ tryLock: () => true, waitLock: () => {}, releaseLock: () => {} }),
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => db.props[k] ?? null,
        setProperty: (k, v) => (db.props[k] = String(v)),
        deleteProperty: (k) => delete db.props[k],
      }),
    },
    Session: {
      getScriptTimeZone: () => TZ,
      getEffectiveUser: () => ({ getEmail: () => 'dev@localhost' }),
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' },
      Charset: { UTF_8: 'utf8' },
      getUuid: () => crypto.randomUUID(),
      computeDigest: (alg, s) => toSigned(crypto.createHash(alg).update(String(s), 'utf8').digest()),
      base64Decode: (s) => toSigned(Buffer.from(s, 'base64')),
      newBlob: (bytes, mime, name) => ({ bytes, mime, name }),
      formatDate,
    },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (content) => ({ content, setMimeType() { return this } }),
    },
    MailApp: { sendEmail: (m) => mails.push(m) },
    UrlFetchApp: {
      // Giả lập tải ảnh từ web: URL chứa "notimage" → HTML, "missing" → 404, còn lại → JPEG nhỏ
      fetch: (url) => {
        fetches.push(url)
        const code = /missing/.test(url) ? 404 : 200
        const mime = /notimage/.test(url) ? 'text/html' : 'image/jpeg'
        const blob = {
          bytes: toSigned(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16])),
          mime,
          name: 'download',
          getBytes() { return this.bytes },
          getContentType: () => mime,
          setName(n) { this.name = n; return this },
        }
        return { getResponseCode: () => code, getBlob: () => blob }
      },
    },
    DriveApp: {
      Access: { ANYONE_WITH_LINK: 'ANYONE_WITH_LINK', ANYONE: 'ANYONE', PRIVATE: 'PRIVATE' },
      Permission: { VIEW: 'VIEW' },
      createFolder: (name) => folderApi(addFolder(name, null)),
      getFileById: (fid) => fileApi(fid),
      getFoldersByName: (name) => iter([...driveFolders.values()].filter((x) => x.name === name).map((x) => folderApi(x.id))),
      getFolderById: (id) => {
        if (!driveFolders.size) addFolder('Ảnh shop (dev)', null, id) // thư mục gốc
        return folderApi(id)
      },
    },
  })

  const code = fs
    .readdirSync(BACKEND_DIR)
    .filter((f) => f.endsWith('.gs'))
    .sort()
    .map((f) => `// ---- ${f}\n` + fs.readFileSync(path.join(BACKEND_DIR, f), 'utf8'))
    .join('\n')
  vm.runInContext(code, context, { filename: 'gas-bundle.js' })

  /** Mỗi request = 1 lần thực thi mới: xoá bộ nhớ tạm theo execution. */
  const resetExecution = () => vm.runInContext('for (const k in _sheetMemo) delete _sheetMemo[k];', context)

  return {
    context,
    mails,
    fetches,
    uploads,
    driveFolders,
    driveSettings,
    db,
    run(fnName, ...args) {
      resetExecution()
      const r = context[fnName](...args)
      save()
      return r
    },
    get(params) {
      resetExecution()
      const out = context.doGet({ parameter: params })
      return JSON.parse(out.content)
    },
    post(body) {
      resetExecution()
      const out = context.doPost({ postData: { contents: typeof body === 'string' ? body : JSON.stringify(body) } })
      save()
      return JSON.parse(out.content)
    },
    isSetup: () => Object.keys(db.sheets).length > 0,
  }
}
