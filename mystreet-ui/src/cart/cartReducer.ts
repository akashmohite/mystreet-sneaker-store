export const MAX_QTY = 10
export const CART_STORAGE_KEY = 'mystreet.cart'

export interface CartItem {
  productId: string
  name: string
  brand: string
  imageUrl: string
  size: string
  unitPrice: number
  quantity: number
  /** stock at the time the item was added; caps the quantity selector */
  maxQty: number
}

export type CartAction =
  | { type: 'add'; item: CartItem }
  | { type: 'remove'; productId: string; size: string }
  | { type: 'setQty'; productId: string; size: string; quantity: number }
  | { type: 'clear' }

const same = (a: CartItem, productId: string, size: string) => a.productId === productId && a.size === size

export const clampQty = (quantity: number, maxQty: number): number => {
  if (!Number.isFinite(quantity)) return 1
  return Math.max(1, Math.min(Math.floor(quantity), Math.max(1, maxQty), MAX_QTY))
}

export function cartReducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case 'add': {
      const existing = state.find((i) => same(i, action.item.productId, action.item.size))
      if (existing) {
        return state.map((i) =>
          i === existing
            ? { ...i, unitPrice: action.item.unitPrice, maxQty: action.item.maxQty,
                quantity: clampQty(i.quantity + action.item.quantity, action.item.maxQty) }
            : i,
        )
      }
      return [...state, { ...action.item, quantity: clampQty(action.item.quantity, action.item.maxQty) }]
    }
    case 'remove':
      return state.filter((i) => !same(i, action.productId, action.size))
    case 'setQty':
      return state.map((i) =>
        same(i, action.productId, action.size) ? { ...i, quantity: clampQty(action.quantity, i.maxQty) } : i,
      )
    case 'clear':
      return []
    default:
      return state
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100
export const lineTotal = (i: CartItem) => round2(i.unitPrice * i.quantity)
export const cartTotal = (items: CartItem[]) => round2(items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0))
export const cartCount = (items: CartItem[]) => items.reduce((sum, i) => sum + i.quantity, 0)

const isCartItem = (x: unknown): x is CartItem => {
  const i = x as CartItem
  return !!i && typeof i.productId === 'string' && typeof i.name === 'string' && typeof i.size === 'string'
    && typeof i.unitPrice === 'number' && typeof i.quantity === 'number' && i.quantity >= 1
}

/** Reads the cart from storage, ignoring corrupt data instead of crashing the app. */
export function loadCart(storage: Pick<Storage, 'getItem'> = window.localStorage): CartItem[] {
  try {
    const raw = storage.getItem(CART_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isCartItem).map((i) => {
      const maxQty = typeof i.maxQty === 'number' && i.maxQty > 0 ? i.maxQty : MAX_QTY
      return { ...i, brand: i.brand ?? '', imageUrl: i.imageUrl ?? '', maxQty, quantity: clampQty(i.quantity, maxQty) }
    })
  } catch {
    return []
  }
}
