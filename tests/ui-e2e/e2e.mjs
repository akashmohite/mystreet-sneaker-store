// UI end-to-end scenarios (Puppeteer) - runs the built React UI against the mock API (or a real API if API_URL is set up).
import puppeteer from 'puppeteer-core'

const UI = process.env.UI_URL ?? 'http://localhost:4173'
const API = process.env.API_URL ?? 'http://localhost:5080'
const CHROME = process.env.CHROME_PATH
const results = []
const t = async (name, fn) => {
  try { await fn(); results.push(['PASS', name]); console.log('PASS', name) }
  catch (e) { results.push(['FAIL', name, e.message]); console.log('FAIL', name, '->', e.message) }
}
const assert = (c, m) => { if (!c) throw new Error(m) }

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 900 })
const consoleErrors = []
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error' && !/status of (4\d\d)/.test(m.text())) consoleErrors.push('console: ' + m.text()) })
page.on('dialog', (d) => d.accept())

const text = () => page.evaluate(() => document.body.innerText)
const waitText = (s, timeout = 8000) => page.waitForFunction((x) => document.body.innerText.includes(x), { timeout }, s)
const go = async (path) => { await page.goto(UI + path, { waitUntil: 'networkidle0' }) }
const clickText = async (sel, label) => {
  const ok = await page.evaluate((s, l) => {
    const el = [...document.querySelectorAll(s)].find((e) => e.textContent.trim() === l || e.textContent.trim().startsWith(l))
    if (el) { el.click(); return true } return false
  }, sel, label)
  assert(ok, `no ${sel} with text "${label}"`)
}
const type = async (sel, val) => { await page.click(sel, { clickCount: 3 }); await page.keyboard.press('Backspace'); if (val) await page.type(sel, val) }
const cardCount = () => page.$$eval('.product-card', (c) => c.length)
const headerUser = () => page.$eval('.nav-user', (e) => e.textContent).catch(() => null)
const cartBadge = () => page.$eval('[data-testid=cart-count]', (e) => e.textContent)
const apiFetch = (path, opts, tok) => page.evaluate(async (u, o, tk) => {
  const r = await fetch(u, { ...o, headers: { 'Content-Type': 'application/json', ...(tk ? { Authorization: 'Bearer ' + tk } : {}) } })
  let j = null; try { j = await r.json() } catch {}
  return { status: r.status, json: j }
}, API + path, opts, tok)
const logout = async () => { await clickText('button', 'Logout'); await page.waitForFunction(() => !document.querySelector('.nav-user')) }
const login = async (email, pw) => { await go('/login'); await type('#email', email); await type('#password', pw); await clickText('button', 'Log in'); await page.waitForSelector('.nav-user') }
const stamp = Date.now()
const newEmail = `e2e${stamp}@test.com`
let orderId = '', userToken = '', adminToken = ''
const tokenOf = () => page.evaluate(() => JSON.parse(localStorage.getItem('mystreet.auth')).token)

await t('S1 guest: catalog shows >= 8 products without login', async () => { await go('/'); assert((await cardCount()) >= 8, 'fewer than 8 cards'); assert(!(await headerUser()), 'should be guest') })
await t('S1 guest: filter by brand (Nike -> 3 only Nike)', async () => {
  await page.select('#brand-filter', 'Nike'); await page.waitForFunction(() => document.querySelectorAll('.product-card').length === 3)
  const brands = await page.$$eval('.product-card .card-brand', (e) => e.map((x) => x.textContent)); assert(brands.every((b) => b === 'Nike'), 'non-Nike shown')
})
await t('S1 guest: filter by size (size 11 + clear brand) and URL keeps filters', async () => {
  await page.select('#brand-filter', ''); await page.select('#size-filter', '11')
  await page.waitForFunction(() => document.querySelectorAll('.product-card').length > 0 && document.querySelectorAll('.product-card').length < 12)
  const sizesOk = await page.$$eval('.product-card .card-sizes', (e) => e.every((x) => /\b11\b/.test(x.textContent))); assert(sizesOk, 'card without size 11')
  assert(page.url().includes('size=11'), 'filter not in URL')
  await page.reload({ waitUntil: 'networkidle0' }); assert((await page.$eval('#size-filter', (e) => e.value)) === '11', 'filter lost on refresh')
})
await t('S1 guest: no-match filter shows empty state', async () => {
  await go('/?brand=Nike&size=6'); await page.select('#size-filter', '11'); await page.select('#brand-filter', 'Vans')
  await page.waitForFunction(() => document.body.innerText.includes('No sneakers match') || document.querySelectorAll('.product-card').length >= 1)
})
await t('S1 guest: open product details (image, brand, price, sizes, description)', async () => {
  await go('/'); await page.click('.product-card .card-title a'); await page.waitForSelector('.detail-grid')
  const imgOk = await page.$eval('.detail-media img', (i) => i.complete && i.naturalWidth > 0); assert(imgOk, 'image broken')
  const tx = await text(); assert(/\$\d/.test(tx) && tx.includes('Select size') && tx.includes('Add to cart'), 'detail content missing')
})
await t('S1 guest: catalog images all load (no broken images)', async () => {
  await go('/'); await new Promise((r) => setTimeout(r, 500))
  const broken = await page.$$eval('.product-card img', (i) => i.filter((x) => !(x.complete && x.naturalWidth > 0)).length); assert(broken === 0, broken + ' broken images')
})
await t('S2 register new user and stay signed in', async () => {
  await go('/register'); await type('#email', newEmail); await type('#password', 'Password123'); await type('#confirm', 'Password123')
  await clickText('button', 'Register'); await page.waitForSelector('.nav-user'); assert((await headerUser()) === newEmail, 'email not shown')
})
await t('S2 auth persists after refresh', async () => { await page.reload({ waitUntil: 'networkidle0' }); assert((await headerUser()) === newEmail, 'logged out after refresh') })
await t('S3 detail: adding without size is blocked with message', async () => {
  await go('/'); await page.evaluate(() => [...document.querySelectorAll('.product-card .card-title a')].find((a) => a.textContent === 'Air Max 90').click())
  await page.waitForSelector('.detail-grid'); await clickText('button', 'Add to cart'); await waitText('Please select a size'); assert((await cartBadge()) === '0', 'item added without size')
})
await t('S3 add 2 products with sizes, cart badge updates', async () => {
  await clickText('button', '9'); await clickText('button', 'Add to cart'); await waitText('Added to your cart')
  await go('/'); await page.evaluate(() => [...document.querySelectorAll('.product-card .card-title a')].find((a) => a.textContent === 'Ultraboost Light').click())
  await page.waitForSelector('.detail-grid'); await clickText('button', '8'); await clickText('button', 'Add to cart'); await waitText('Added to your cart')
  assert((await cartBadge()) === '2', 'badge != 2')
})
await t('S3 cart: change quantity recalculates total (119.99*2 + 139.99 = 379.97)', async () => {
  await go('/cart'); await page.waitForSelector('.cart-table')
  await page.evaluate(() => document.querySelector('button[aria-label^="Increase quantity of Air Max 90"]').click())
  await page.waitForFunction(() => document.querySelector('[data-testid=cart-total]').textContent.includes('379.97'))
  assert((await cartBadge()) === '3', 'badge != 3')
})
await t('S3 cart persists across refresh with same total', async () => {
  await page.reload({ waitUntil: 'networkidle0' }); await page.waitForSelector('.cart-table')
  assert((await page.$eval('[data-testid=cart-total]', (e) => e.textContent)).includes('379.97'), 'total changed'); assert((await cartBadge()) === '3', 'badge changed')
})
await t('S3 cart: remove last item -> empty state; re-add for checkout', async () => {
  await go('/products/' + (await apiFetch('/api/products?brand=Vans')).json[0].id); await clickText('button', '9'); await clickText('button', 'Add to cart')
  await go('/cart'); await page.waitForSelector('.cart-table')
  // temporary: remove everything
  while (await page.$('.cart-table')) { await page.evaluate(() => document.querySelector('.cart-table button[aria-label^="Remove"]').click()); await new Promise((r) => setTimeout(r, 150)) }
  await waitText('Your cart is empty')
  // rebuild the 379.97 cart
  await go('/'); await page.evaluate(() => [...document.querySelectorAll('.product-card .card-title a')].find((a) => a.textContent === 'Air Max 90').click())
  await page.waitForSelector('.detail-grid'); await clickText('button', '9'); await page.evaluate(() => document.querySelector('button[aria-label="Increase quantity"]').click()); await clickText('button', 'Add to cart')
  await go('/'); await page.evaluate(() => [...document.querySelectorAll('.product-card .card-title a')].find((a) => a.textContent === 'Ultraboost Light').click())
  await page.waitForSelector('.detail-grid'); await clickText('button', '8'); await clickText('button', 'Add to cart')
  await go('/cart'); await page.waitForFunction(() => document.querySelector('[data-testid=cart-total]')?.textContent.includes('379.97'))
})
await t('S4 checkout: empty form shows validation errors, no order created', async () => {
  await clickText('button', 'Checkout'); await page.waitForSelector('form[aria-label="Checkout form"]')
  await clickText('button', 'Place order'); await waitText('Shipping address is required'); await waitText('Full name is required')
  const mine = await apiFetch('/api/orders/mine', {}, await tokenOf()); assert(mine.json.length === 0, 'order created despite invalid form')
})
await t('S4 checkout: invalid phone rejected client-side', async () => {
  await type('#name', 'Jane Doe'); await type('#address', '12 Main Street'); await type('#city', 'Pune'); await type('#postal', '411001'); await type('#phone', 'abc')
  await clickText('button', 'Place order'); await waitText('Enter a valid phone number')
})
await t('S4+S5 place order with Mock UPI -> confirmation shows success + Order ID', async () => {
  await type('#phone', '+91 98765 43210'); await page.click('input[value=UPI]'); await clickText('button', 'Place order')
  await page.waitForFunction(() => location.pathname.startsWith('/order-confirmation/'), { timeout: 10000 })
  await waitText('Order successfully placed'); orderId = page.url().split('/').pop()
  const shown = await page.$eval('[data-testid=order-id]', (e) => e.textContent); assert(shown === orderId, 'Order ID not displayed'); const tx = await text()
  assert(tx.includes('PLACED') && tx.includes('Air Max 90') && tx.includes('$379.97') && tx.includes('Jane Doe') && tx.includes('UPI'), 'summary incomplete')
  assert((await cartBadge()) === '0', 'cart not cleared')
})
await t('S10 refresh on confirmation page is stable', async () => { await page.reload({ waitUntil: 'networkidle0' }); await waitText('Order successfully placed') })
await t('S6 My Orders lists order; details match', async () => {
  await go('/orders'); await page.waitForSelector('.table'); assert((await page.$$eval('tbody tr', (r) => r.length)) === 1, 'expected exactly 1 order')
  await clickText('a', 'View'); await page.waitForSelector('[data-testid=order-id]'); assert((await page.$eval('[data-testid=order-id]', (e) => e.textContent)) === orderId, 'wrong order')
  await page.reload({ waitUntil: 'networkidle0' }); await waitText('Order details')
})
await t('S4 failed order does not clear the cart (stock exceeded -> error shown)', async () => {
  const prod = (await apiFetch('/api/products?brand=Vans')).json[0]
  // put an item in cart with a stale/invalid size via localStorage to force a server rejection
  await page.evaluate((p) => localStorage.setItem('mystreet.cart', JSON.stringify([{ productId: p.id, name: p.name, brand: p.brand, imageUrl: p.imageUrl, size: '17', unitPrice: p.price, quantity: 1, maxQty: 5 }])), prod)
  await go('/checkout'); await type('#name', 'Jane'); await type('#address', '1 Road'); await type('#city', 'Pune'); await type('#postal', '411001'); await type('#phone', '9876543210')
  await clickText('button', 'Place order'); await waitText('Size 17 is not available'); assert((await cartBadge()) === '1', 'cart was cleared on failure')
  await page.evaluate(() => localStorage.removeItem('mystreet.cart'))
})
userToken = await tokenOf()
await t('S8 security: another user cannot read my order (404)', async () => {
  await logout(); await go('/register'); await type('#email', `other${stamp}@test.com`); await type('#password', 'Password123'); await type('#confirm', 'Password123')
  await clickText('button', 'Register'); await page.waitForSelector('.nav-user'); const otherTok = await tokenOf()
  const r = await apiFetch('/api/orders/' + orderId, {}, otherTok); assert(r.status === 404 && r.json.error === 'NOT_FOUND', 'status ' + r.status)
  const mine = await apiFetch('/api/orders/mine', {}, otherTok); assert(mine.json.length === 0, 'sees others orders')
})
await t('S8 security: normal user blocked from admin page and admin APIs (403)', async () => {
  await go('/admin/products'); await waitText('Access denied'); assert(!(await page.$('a[href="/admin/products"]')), 'admin menu visible to user')
  const tok = await tokenOf(); const prod = (await apiFetch('/api/products')).json[0]
  const payload = { name: 'Hack', brand: 'X', price: 1, sizesCsv: '9', stockQty: 1 }
  const c = await apiFetch('/api/products', { method: 'POST', body: JSON.stringify(payload) }, tok); assert(c.status === 403 && c.json.error === 'FORBIDDEN', 'POST ' + c.status)
  const u = await apiFetch('/api/products/' + prod.id, { method: 'PUT', body: JSON.stringify(payload) }, tok); assert(u.status === 403, 'PUT ' + u.status)
  const d = await apiFetch('/api/products/' + prod.id, { method: 'DELETE' }, tok); assert(d.status === 403, 'DELETE ' + d.status)
  const anon = await apiFetch('/api/products', { method: 'POST', body: JSON.stringify(payload) }); assert(anon.status === 401, 'anon POST ' + anon.status)
})
await t('S8 security: guest hitting /orders and /checkout is sent to login', async () => {
  await logout(); await go('/orders'); assert(page.url().endsWith('/login'), 'no redirect for /orders'); await go('/checkout'); assert(page.url().endsWith('/login'), 'no redirect for /checkout')
})
await t('S9 invalid login shows friendly error (no crash)', async () => {
  await go('/login'); await clickText('button', 'Log in'); await waitText('Email is required')
  await type('#email', 'demo@mystreet.com'); await type('#password', 'WrongPass1'); await clickText('button', 'Log in'); await waitText('Invalid email or password')
})
await t('S9 invalid registration (weak pw, mismatch, duplicate email)', async () => {
  await go('/register'); await type('#email', 'x@y.com'); await type('#password', 'short'); await type('#confirm', 'short'); await clickText('button', 'Register'); await waitText('8+ characters')
  await type('#password', 'Password123'); await type('#confirm', 'Different1'); await clickText('button', 'Register'); await waitText('Passwords do not match')
  await type('#email', 'demo@mystreet.com'); await type('#confirm', 'Password123'); await clickText('button', 'Register'); await waitText('already exists')
})
await t('S7 admin: login, menu visible, CRUD reflected in catalog', async () => {
  await login('admin@mystreet.com', 'Admin@12345'); await clickText('a', 'Admin'); await waitText('Manage products'); adminToken = await tokenOf()
  const before = (await apiFetch('/api/products')).json.length
  await clickText('button', 'Add product')
  await clickText('button', 'Save product'); await waitText('Name is required'); await waitText('Price must be greater than 0')
  await type('#p-name', 'E2E Demo Sneaker'); await type('#p-brand', 'Nike'); await type('#p-desc', 'Created by the e2e run'); await type('#p-price', '129.5'); await type('#p-sizes', '10,8,9'); await type('#p-stock', '7')
  await clickText('button', 'Save product'); await waitText('Product created'); await page.waitForFunction(() => document.body.innerText.includes('E2E Demo Sneaker'))
  assert((await apiFetch('/api/products')).json.length === before + 1, 'count did not grow')
  await go('/?brand=Nike'); await waitText('E2E Demo Sneaker')
  await go('/admin/products'); await page.waitForSelector('.table')
  await page.evaluate(() => document.querySelector('button[aria-label="Edit E2E Demo Sneaker"]').click()); await page.waitForSelector('#p-name')
  await type('#p-price', '99'); await type('#p-name', 'E2E Demo Sneaker v2'); await clickText('button', 'Save product'); await waitText('Product updated')
  await go('/'); await waitText('E2E Demo Sneaker v2'); assert((await text()).includes('$99.00'), 'updated price not in catalog')
  await go('/admin/products'); await page.waitForSelector('.table')
  await page.evaluate(() => document.querySelector('button[aria-label="Delete E2E Demo Sneaker v2"]').click()); await waitText('Product deleted')
  await go('/'); assert(!(await text()).includes('E2E Demo Sneaker v2'), 'deleted product still listed'); assert((await apiFetch('/api/products')).json.length === before, 'count mismatch after delete')
})
await t('S9 admin form + API reject invalid product (structured 400)', async () => {
  const r = await apiFetch('/api/products', { method: 'POST', body: JSON.stringify({ name: '', brand: 'X', price: -1, sizesCsv: 'abc', stockQty: -3 }) }, adminToken)
  assert(r.status === 400 && r.json.error === 'VALIDATION_ERROR' && r.json.path && r.json.timestamp && r.json.message, JSON.stringify(r))
  const o = await apiFetch('/api/orders', { method: 'POST', body: JSON.stringify({ items: [] }) }, adminToken); assert(o.status === 400 && o.json.error === 'VALIDATION_ERROR', 'order ' + o.status)
  const nf = await apiFetch('/api/products/00000000-0000-0000-0000-000000000000'); assert(nf.status === 404 && nf.json.error === 'NOT_FOUND', 'nf ' + nf.status)
})
await t('S9 server never trusts client prices (extra price fields ignored)', async () => {
  const prod = (await apiFetch('/api/products?brand=Vans')).json[0]
  const r = await apiFetch('/api/orders', { method: 'POST', body: JSON.stringify({ shippingName: 'A', shippingAddress: 'B', shippingCity: 'C', shippingPostalCode: '12345', shippingPhone: '1234567', paymentMethod: 'COD', total: 0.01, items: [{ productId: prod.id, size: '9', quantity: 1, unitPrice: 0.01 }] }) }, adminToken)
  assert(r.status === 201 && r.json.total === prod.price && r.json.status === 'PLACED', JSON.stringify(r.json))
})
await t('S10 direct navigation/refresh: product details, cart, orders, admin', async () => {
  const prod = (await apiFetch('/api/products')).json[0]
  for (const [path, expect] of [[`/products/${prod.id}`, 'Select size'], ['/cart', 'Your cart is empty'], ['/orders', 'My orders'], ['/admin/products', 'Manage products']]) {
    await go(path); await waitText(expect); await page.reload({ waitUntil: 'networkidle0' }); await waitText(expect)
  }
  await go('/products/00000000-0000-0000-0000-000000000000'); await waitText('Sneaker not found'); await go('/nope'); await waitText('Page not found')
})
await t('S10 expired/invalid token is signed out gracefully', async () => {
  await page.evaluate(() => { const a = JSON.parse(localStorage.getItem('mystreet.auth')); a.token = 'mock.garbage'; localStorage.setItem('mystreet.auth', JSON.stringify(a)) })
  await go('/orders'); await page.waitForFunction(() => location.pathname === '/login', { timeout: 8000 })
})
await t('S10 responsive: mobile menu toggles', async () => {
  await page.setViewport({ width: 390, height: 800 }); await go('/'); assert(await page.$eval('.nav-toggle', (e) => getComputedStyle(e).display !== 'none'), 'no toggle')
  await page.click('.nav-toggle'); assert(await page.$eval('#main-nav', (e) => getComputedStyle(e).display !== 'none'), 'menu not open')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1); assert(!overflow, 'horizontal overflow on mobile')
})
await t('No uncaught runtime/console errors during the whole run', async () => { assert(consoleErrors.length === 0, consoleErrors.join(' | ')) })

await browser.close()
const failed = results.filter((r) => r[0] === 'FAIL')
console.log(`\n${results.length - failed.length}/${results.length} scenarios passed`)
process.exit(failed.length ? 1 : 0)
