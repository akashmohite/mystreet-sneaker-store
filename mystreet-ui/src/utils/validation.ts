import type { ShippingValues } from '../types'

export type Errors<T> = Partial<Record<keyof T, string>>

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const PHONE = /^[0-9+\-\s]{7,20}$/
const POSTAL = /^[A-Za-z0-9\- ]{3,10}$/
const SIZE = /^\d{1,2}(\.5)?$/

export const isEmail = (v: string) => EMAIL.test(v.trim())
export const isStrongPassword = (v: string) =>
  v.length >= 8 && v.length <= 100 && /[A-Za-z]/.test(v) && /\d/.test(v)

export function validateLogin(v: { email: string; password: string }): Errors<typeof v> {
  const e: Errors<typeof v> = {}
  if (!v.email.trim()) e.email = 'Email is required'
  else if (!isEmail(v.email)) e.email = 'Please enter a valid email address'
  if (!v.password) e.password = 'Password is required'
  return e
}

export function validateRegister(v: { email: string; password: string; confirm: string }): Errors<typeof v> {
  const e: Errors<typeof v> = {}
  if (!v.email.trim()) e.email = 'Email is required'
  else if (!isEmail(v.email)) e.email = 'Please enter a valid email address'
  if (!v.password) e.password = 'Password is required'
  else if (!isStrongPassword(v.password))
    e.password = 'Use 8+ characters with at least one letter and one number'
  if (v.confirm !== v.password) e.confirm = 'Passwords do not match'
  return e
}

export function validateShipping(v: ShippingValues): Errors<ShippingValues> {
  const e: Errors<ShippingValues> = {}
  if (!v.shippingName.trim()) e.shippingName = 'Full name is required'
  if (!v.shippingAddress.trim()) e.shippingAddress = 'Shipping address is required'
  if (!v.shippingCity.trim()) e.shippingCity = 'City is required'
  if (!v.shippingPostalCode.trim()) e.shippingPostalCode = 'Postal code is required'
  else if (!POSTAL.test(v.shippingPostalCode.trim())) e.shippingPostalCode = 'Enter a valid postal code'
  if (!v.shippingPhone.trim()) e.shippingPhone = 'Phone number is required'
  else if (!PHONE.test(v.shippingPhone.trim())) e.shippingPhone = 'Enter a valid phone number (7-20 digits)'
  return e
}

export interface ProductFormValues {
  name: string
  brand: string
  description: string
  price: string
  sizesCsv: string
  stockQty: string
  imageUrl: string
}

export function validateProductForm(v: ProductFormValues): Errors<ProductFormValues> {
  const e: Errors<ProductFormValues> = {}
  if (!v.name.trim()) e.name = 'Name is required'
  if (!v.brand.trim()) e.brand = 'Brand is required'
  const price = Number(v.price)
  if (v.price.trim() === '' || Number.isNaN(price) || price <= 0) e.price = 'Price must be greater than 0'
  else if (Math.round(price * 100) / 100 !== price) e.price = 'Price can have at most 2 decimals'
  const stock = Number(v.stockQty)
  if (v.stockQty.trim() === '' || !Number.isInteger(stock) || stock < 0) e.stockQty = 'Stock must be a whole number, 0 or more'
  const sizes = v.sizesCsv.split(',').map((s) => s.trim()).filter(Boolean)
  if (sizes.length === 0) e.sizesCsv = 'Enter at least one size, e.g. 7,8,9,10'
  else if (sizes.some((s) => !SIZE.test(s) || parseFloat(s) < 3 || parseFloat(s) > 18))
    e.sizesCsv = 'Sizes must be numbers between 3 and 18 (e.g. 7,8,9.5)'
  const url = v.imageUrl.trim()
  if (url && !(url.startsWith('/') && !url.startsWith('//')) && !/^https?:\/\//i.test(url))
    e.imageUrl = 'Use an http(s) link or a path starting with /'
  return e
}
