import { describe, expect, it } from 'vitest'
import { validateLogin, validateProductForm, validateRegister, validateShipping } from './validation'

const shipping = {
  shippingName: 'Jane', shippingAddress: '12 Main St', shippingCity: 'Pune',
  shippingPostalCode: '411001', shippingPhone: '+91 98765 43210',
}

describe('validateShipping', () => {
  it('accepts valid data', () => expect(validateShipping(shipping)).toEqual({}))
  it('requires every field', () => {
    const e = validateShipping({ shippingName: '', shippingAddress: '', shippingCity: '', shippingPostalCode: '', shippingPhone: '' })
    expect(Object.keys(e)).toHaveLength(5)
  })
  it('rejects bad phone and postal code', () => {
    const e = validateShipping({ ...shipping, shippingPhone: 'abc', shippingPostalCode: '!!' })
    expect(e.shippingPhone).toBeTruthy()
    expect(e.shippingPostalCode).toBeTruthy()
  })
})

describe('auth forms', () => {
  it('login requires valid email and password', () => {
    expect(validateLogin({ email: '', password: '' })).toHaveProperty('email')
    expect(validateLogin({ email: 'bad', password: 'x' })).toHaveProperty('email')
    expect(validateLogin({ email: 'a@b.com', password: 'x' })).toEqual({})
  })
  it('register enforces password strength and confirmation', () => {
    expect(validateRegister({ email: 'a@b.com', password: 'short', confirm: 'short' })).toHaveProperty('password')
    expect(validateRegister({ email: 'a@b.com', password: 'Password123', confirm: 'nope' })).toHaveProperty('confirm')
    expect(validateRegister({ email: 'a@b.com', password: 'Password123', confirm: 'Password123' })).toEqual({})
  })
})

describe('validateProductForm', () => {
  const ok = { name: 'X', brand: 'Nike', description: '', price: '99.5', sizesCsv: '8,9,10', stockQty: '5', imageUrl: '' }
  it('accepts valid data', () => expect(validateProductForm(ok)).toEqual({}))
  it('rejects bad price, stock, sizes and image', () => {
    expect(validateProductForm({ ...ok, price: '0' })).toHaveProperty('price')
    expect(validateProductForm({ ...ok, price: '1.234' })).toHaveProperty('price')
    expect(validateProductForm({ ...ok, stockQty: '-1' })).toHaveProperty('stockQty')
    expect(validateProductForm({ ...ok, stockQty: '1.5' })).toHaveProperty('stockQty')
    expect(validateProductForm({ ...ok, sizesCsv: 'abc' })).toHaveProperty('sizesCsv')
    expect(validateProductForm({ ...ok, sizesCsv: '' })).toHaveProperty('sizesCsv')
    expect(validateProductForm({ ...ok, imageUrl: 'javascript:alert(1)' })).toHaveProperty('imageUrl')
  })
})
