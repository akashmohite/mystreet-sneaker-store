// Contract-faithful MOCK of the MyStreeT API (same routes, validation rules, status codes and error body).
// Purpose: let the React UI be exercised end-to-end WITHOUT SQL Server / .NET. It is NOT the real backend.
import http from 'node:http'
import { randomUUID } from 'node:crypto'

const PORT = Number(process.env.PORT ?? 5080)
const img = (n) => `/sneakers/${n}.svg`
const mk = (name, brand, price, sizes, stock, image, description) =>
  ({ id: randomUUID(), name, brand, price, sizesCsv: sizes, stockQty: stock, imageUrl: img(image), description, isActive: true })
let products = [
  mk('Air Max 90', 'Nike', 119.99, '7,8,9,10', 50, 'air-max-90', 'Street classic.'),
  mk('Air Force 1 Low', 'Nike', 109.99, '6,7,8,9,10,11', 60, 'air-force-1', 'Court icon.'),
  mk('Dunk Low Retro', 'Nike', 114.99, '7,8,9,10,11', 40, 'dunk-low', 'Colour blocking.'),
  mk('Ultraboost Light', 'Adidas', 139.99, '7,8,9,10,11', 35, 'ultraboost', 'Boost cushioning.'),
  mk('Samba OG', 'Adidas', 99.99, '6,7,8,9,10', 45, 'samba', 'Terrace classic.'),
  mk('Gazelle', 'Adidas', 94.99, '7,8,9,10', 30, 'gazelle', 'Soft suede.'),
  mk('574 Core', 'New Balance', 89.99, '7,8,9,10,11', 55, 'nb-574', 'Heritage runner.'),
  mk('990v6', 'New Balance', 199.99, '8,9,10,11', 20, 'nb-990', 'Premium.'),
  mk('Chuck 70 High', 'Converse', 89.99, '6,7,8,9,10', 70, 'chuck-70', 'Canvas high-top.'),
  mk('Old Skool', 'Vans', 74.99, '6,7,8,9,10,11', 80, 'old-skool', 'Skate shoe.'),
  mk('Suede Classic XXI', 'Puma', 79.99, '7,8,9,10', 38, 'puma-suede', 'Soft suede.'),
  mk('Classic Leather', 'Reebok', 84.99, '7,8,9,10,11', 42, 'reebok-classic', 'Timeless.'),
]
const users = [
  { id: randomUUID(), email: 'admin@mystreet.com', password: 'Admin@12345', isAdmin: true },
  { id: randomUUID(), email: 'demo@mystreet.com', password: 'Demo@12345', isAdmin: false },
]
const orders = []

class HttpError extends Error { constructor(status, error, message) { super(message); this.status = status; this.error = error } }
const bad = (m) => new HttpError(400, 'VALIDATION_ERROR', m)

const sizeOk = (s) => /^\d{1,2}(\.5)?$/.test(s) && parseFloat(s) >= 3 && parseFloat(s) <= 18
function cleanProduct(b) {
  const name = String(b.name ?? '').trim(), brand = String(b.brand ?? '').trim()
  if (!name) throw bad('Product name is required')
  if (!brand) throw bad('Brand is required')
  const price = Number(b.price)
  if (!(price > 0) || price > 100000) throw bad('Price must be greater than 0 and at most 100000')
  const stock = Number(b.stockQty)
  if (!Number.isInteger(stock) || stock < 0) throw bad('Stock quantity must be between 0 and 100000')
  const sizes = [...new Set(String(b.sizesCsv ?? '').split(',').map((s) => s.trim()).filter(Boolean))]
  if (!sizes.length) throw bad('At least one size is required (e.g. 7,8,9,10)')
  const badSize = sizes.find((s) => !sizeOk(s))
  if (badSize) throw bad(`'${badSize}' is not a valid size. Use numbers between 3 and 18, e.g. 7,8,9.5`)
  sizes.sort((a, c) => parseFloat(a) - parseFloat(c))
  let image = String(b.imageUrl ?? '').trim()
  if (!image) image = '/sneakers/placeholder.svg'
  else if (!((image.startsWith('/') && !image.startsWith('//')) || /^https?:\/\//i.test(image))) throw bad('Image URL must be an http(s) link or a path starting with \'/\'')
  return { name, brand, description: String(b.description ?? '').trim(), price, sizesCsv: sizes.join(','), stockQty: stock, imageUrl: image }
}
const dto = (p) => ({ ...p, sizes: p.sizesCsv.split(',') })

function token(u) {
  return 'mock.' + Buffer.from(JSON.stringify({ sub: u.id, email: u.email, role: u.isAdmin ? 'Admin' : 'User' })).toString('base64url')
}
function auth(req) {
  const h = req.headers.authorization ?? ''
  if (!h.startsWith('Bearer mock.')) throw new HttpError(401, 'UNAUTHORIZED', 'Please sign in to continue')
  try { return JSON.parse(Buffer.from(h.slice(12), 'base64url').toString()) } catch { throw new HttpError(401, 'UNAUTHORIZED', 'Please sign in to continue') }
}
const admin = (req) => { const c = auth(req); if (c.role !== 'Admin') throw new HttpError(403, 'FORBIDDEN', 'You do not have permission to perform this action'); return c }
const authResp = (u) => ({ token: token(u), email: u.email, isAdmin: u.isAdmin, expiresAt: new Date(Date.now() + 2 * 3600e3).toISOString() })
const orderDto = (o) => ({ ...o })

async function body(req) {
  const chunks = []; for await (const c of req) chunks.push(c)
  if (!chunks.length) return {}
  try { return JSON.parse(Buffer.concat(chunks).toString()) } catch { throw bad('The request is invalid') }
}

async function route(req, res, url) {
  const m = req.method, p = url.pathname
  let r
  if (m === 'POST' && p === '/api/auth/register') {
    const b = await body(req); const email = String(b.email ?? '').trim().toLowerCase()
    if (!email) throw bad('Email is required')
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw bad('Please enter a valid email address')
    const pw = String(b.password ?? '')
    if (!(pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw))) throw bad('Password must be 8-100 characters and include at least one letter and one number')
    if (users.some((u) => u.email === email)) throw new HttpError(409, 'CONFLICT', 'An account with this email already exists')
    const u = { id: randomUUID(), email, password: pw, isAdmin: false }; users.push(u)
    return [201, authResp(u)]
  }
  if (m === 'POST' && p === '/api/auth/login') {
    const b = await body(req); const email = String(b.email ?? '').trim().toLowerCase()
    if (!email || !b.password) throw bad('Email and password are required')
    const u = users.find((x) => x.email === email && x.password === b.password)
    if (!u) throw new HttpError(401, 'UNAUTHORIZED', 'Invalid email or password')
    return [200, authResp(u)]
  }
  if (m === 'POST' && p === '/api/auth/logout') { auth(req); return [204] }
  if (m === 'GET' && p === '/api/health') return [200, { status: 'ok' }]

  if (m === 'GET' && p === '/api/products') {
    const brand = url.searchParams.get('brand')?.trim().toLowerCase(), size = url.searchParams.get('size')?.trim()
    r = products.filter((x) => x.isActive && (!brand || x.brand.toLowerCase() === brand) && (!size || x.sizesCsv.split(',').includes(size)))
    r.sort((a, c) => a.brand.localeCompare(c.brand) || a.name.localeCompare(c.name))
    return [200, r.map(dto)]
  }
  let mt = p.match(/^\/api\/products\/([0-9a-f-]{36})$/)
  if (mt) {
    const found = products.find((x) => x.id === mt[1] && x.isActive)
    if (m === 'GET') { if (!found) throw new HttpError(404, 'NOT_FOUND', 'Product not found'); return [200, dto(found)] }
    if (m === 'PUT') { admin(req); const b = await body(req); if (!found) throw new HttpError(404, 'NOT_FOUND', 'Product not found'); Object.assign(found, cleanProduct(b)); return [200, dto(found)] }
    if (m === 'DELETE') {
      admin(req); if (!found) throw new HttpError(404, 'NOT_FOUND', 'Product not found')
      const used = orders.some((o) => o.items.some((i) => i.productId === found.id))
      if (used) found.isActive = false; else products = products.filter((x) => x !== found)
      return [204]
    }
  }
  if (m === 'POST' && p === '/api/products') { admin(req); const b = await body(req); const np = { id: randomUUID(), isActive: true, ...cleanProduct(b) }; products.push(np); return [201, dto(np)] }

  if (m === 'POST' && p === '/api/orders') {
    const c = auth(req); const b = await body(req)
    for (const [k, label] of [['shippingName', 'Full name'], ['shippingAddress', 'Shipping address'], ['shippingCity', 'City'], ['shippingPostalCode', 'Postal code'], ['shippingPhone', 'Phone number']])
      if (!String(b[k] ?? '').trim()) throw bad(`${label} is required`)
    if (!/^[0-9+\-\s]{7,20}$/.test(b.shippingPhone.trim())) throw bad('Please enter a valid phone number')
    if (!/^[A-Za-z0-9\- ]{3,10}$/.test(b.shippingPostalCode.trim())) throw bad('Please enter a valid postal code')
    const pay = String(b.paymentMethod ?? '').trim().toUpperCase()
    if (pay !== 'COD' && pay !== 'UPI') throw bad('Payment method must be Cash on Delivery or UPI')
    if (!Array.isArray(b.items) || !b.items.length) throw bad('Your cart is empty')
    const items = []
    for (const i of b.items) {
      const prod = products.find((x) => x.id === i.productId && x.isActive)
      if (!Number.isInteger(i.quantity) || i.quantity < 1 || i.quantity > 10) throw bad('Quantity must be between 1 and 10')
      if (!prod) throw bad('One of the products in your cart is no longer available')
      if (!prod.sizesCsv.split(',').includes(String(i.size))) throw bad(`Size ${i.size} is not available for ${prod.name}`)
      items.push({ productId: prod.id, productName: prod.name, brand: prod.brand, imageUrl: prod.imageUrl, size: String(i.size), quantity: i.quantity, unitPrice: prod.price, lineTotal: Math.round(prod.price * i.quantity * 100) / 100 })
    }
    const total = Math.round(items.reduce((s, i) => s + i.lineTotal, 0) * 100) / 100
    const o = { id: randomUUID(), userId: c.sub, status: 'PLACED', paymentMethod: pay, total, createdAt: new Date().toISOString(),
      shippingName: b.shippingName.trim(), shippingAddress: b.shippingAddress.trim(), shippingCity: b.shippingCity.trim(), shippingPostalCode: b.shippingPostalCode.trim(), shippingPhone: b.shippingPhone.trim(), items }
    orders.push(o); return [201, orderDto(o)]
  }
  if (m === 'GET' && p === '/api/orders/mine') { const c = auth(req); return [200, orders.filter((o) => o.userId === c.sub).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(orderDto)] }
  mt = p.match(/^\/api\/orders\/([0-9a-f-]{36})$/)
  if (m === 'GET' && mt) { const c = auth(req); const o = orders.find((x) => x.id === mt[1] && x.userId === c.sub); if (!o) throw new HttpError(404, 'NOT_FOUND', 'Order not found'); return [200, orderDto(o)] }
  throw new HttpError(404, 'NOT_FOUND', 'Resource not found')
}

http.createServer(async (req, res) => {
  const origin = req.headers.origin ?? '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Headers', 'content-type, authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end() }
  const url = new URL(req.url, 'http://x')
  try {
    const [status, data] = await route(req, res, url)
    res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(data === undefined ? '' : JSON.stringify(data))
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500
    const error = e instanceof HttpError ? e.error : 'INTERNAL_ERROR'
    const message = e instanceof HttpError ? e.message : 'Something went wrong on our side. Please try again.'
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ timestamp: new Date().toISOString(), path: url.pathname, error, message }))
  }
}).listen(PORT, () => console.log(`MOCK API listening on http://localhost:${PORT}`))
