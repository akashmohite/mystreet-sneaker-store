export interface Product {
  id: string
  name: string
  brand: string
  description: string
  price: number
  sizesCsv: string
  sizes: string[]
  stockQty: number
  imageUrl: string
}

export interface ProductInput {
  name: string
  brand: string
  description: string
  price: number
  sizesCsv: string
  stockQty: number
  imageUrl: string
}

export interface AuthUser {
  token: string
  email: string
  isAdmin: boolean
  expiresAt: string
}

export type PaymentMethod = 'COD' | 'UPI'

export interface ShippingValues {
  shippingName: string
  shippingAddress: string
  shippingCity: string
  shippingPostalCode: string
  shippingPhone: string
}

export interface CreateOrderPayload extends ShippingValues {
  paymentMethod: PaymentMethod
  items: { productId: string; size: string; quantity: number }[]
}

export interface OrderItem {
  productId: string
  productName: string
  brand: string
  imageUrl: string
  size: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface Order extends ShippingValues {
  id: string
  status: string
  paymentMethod: string
  total: number
  createdAt: string
  items: OrderItem[]
}
