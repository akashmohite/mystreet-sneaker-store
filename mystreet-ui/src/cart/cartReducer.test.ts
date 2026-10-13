import { describe, expect, it } from 'vitest'
import { cartCount, cartReducer, cartTotal, clampQty, lineTotal, loadCart, MAX_QTY, type CartItem } from './cartReducer'

const item = (over: Partial<CartItem> = {}): CartItem => ({
  productId: 'p1', name: 'Air Max 90', brand: 'Nike', imageUrl: '/x.svg',
  size: '9', unitPrice: 119.99, quantity: 1, maxQty: 5, ...over,
})

describe('cartReducer', () => {
  it('adds a new item', () => {
    const s = cartReducer([], { type: 'add', item: item() })
    expect(s).toHaveLength(1)
    expect(s[0].quantity).toBe(1)
  })

  it('merges the same product+size and keeps different sizes separate', () => {
    let s = cartReducer([], { type: 'add', item: item() })
    s = cartReducer(s, { type: 'add', item: item() })
    s = cartReducer(s, { type: 'add', item: item({ size: '10' }) })
    expect(s).toHaveLength(2)
    expect(s.find((i) => i.size === '9')!.quantity).toBe(2)
  })

  it('never exceeds stock or the max quantity', () => {
    let s = cartReducer([], { type: 'add', item: item({ quantity: 4, maxQty: 5 }) })
    s = cartReducer(s, { type: 'add', item: item({ quantity: 4, maxQty: 5 }) })
    expect(s[0].quantity).toBe(5)
    s = cartReducer(s, { type: 'setQty', productId: 'p1', size: '9', quantity: 99 })
    expect(s[0].quantity).toBe(5)
    expect(clampQty(99, 99)).toBe(MAX_QTY)
  })

  it('rejects invalid quantities (0, negative, NaN) by clamping to 1', () => {
    const s0 = [item({ quantity: 3 })]
    expect(cartReducer(s0, { type: 'setQty', productId: 'p1', size: '9', quantity: 0 })[0].quantity).toBe(1)
    expect(cartReducer(s0, { type: 'setQty', productId: 'p1', size: '9', quantity: -4 })[0].quantity).toBe(1)
    expect(cartReducer(s0, { type: 'setQty', productId: 'p1', size: '9', quantity: NaN })[0].quantity).toBe(1)
  })

  it('removes an item and ends with an empty cart', () => {
    const s = cartReducer([item()], { type: 'remove', productId: 'p1', size: '9' })
    expect(s).toEqual([])
  })

  it('recalculates totals immediately when quantity changes', () => {
    let s = [item({ unitPrice: 119.99, maxQty: 10 }), item({ productId: 'p2', unitPrice: 139.99, size: '8', maxQty: 10 })]
    expect(cartTotal(s)).toBe(259.98)
    s = cartReducer(s, { type: 'setQty', productId: 'p1', size: '9', quantity: 3 })
    expect(lineTotal(s[0])).toBe(359.97)
    expect(cartTotal(s)).toBe(499.96)
    expect(cartCount(s)).toBe(4)
  })

  it('clears the cart', () => {
    expect(cartReducer([item()], { type: 'clear' })).toEqual([])
  })
})

describe('loadCart', () => {
  const store = (v: string | null) => ({ getItem: () => v })

  it('returns [] for missing, corrupt or wrongly shaped data', () => {
    expect(loadCart(store(null))).toEqual([])
    expect(loadCart(store('{not json'))).toEqual([])
    expect(loadCart(store('{"a":1}'))).toEqual([])
    expect(loadCart(store('[{"foo":"bar"}]'))).toEqual([])
  })

  it('restores a persisted cart (survives refresh)', () => {
    const saved = JSON.stringify([item({ quantity: 2 })])
    const restored = loadCart(store(saved))
    expect(restored).toHaveLength(1)
    expect(restored[0].quantity).toBe(2)
  })
})
