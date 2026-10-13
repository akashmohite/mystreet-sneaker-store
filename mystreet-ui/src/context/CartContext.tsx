import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from 'react'
import { CART_STORAGE_KEY, cartCount, cartReducer, cartTotal, loadCart, type CartAction, type CartItem } from '../cart/cartReducer'

interface CartContextValue {
  items: CartItem[]
  count: number
  total: number
  dispatch: Dispatch<CartAction>
}

const CartContext = createContext<CartContextValue | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(cartReducer, undefined, () => loadCart())

  // Persist on every change so the cart survives a browser refresh.
  useEffect(() => {
    try { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items)) } catch { /* storage full/blocked */ }
  }, [items])

  const value = useMemo(
    () => ({ items, count: cartCount(items), total: cartTotal(items), dispatch }),
    [items],
  )
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
