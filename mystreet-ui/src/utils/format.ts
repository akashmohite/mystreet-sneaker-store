const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export const formatPrice = (value: number): string => usd.format(value)

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export const paymentLabel = (method: string): string =>
  method === 'COD' ? 'Cash on Delivery' : method === 'UPI' ? 'UPI (mock)' : method

export const sortSizes = (sizes: string[]): string[] =>
  [...sizes].sort((a, b) => parseFloat(a) - parseFloat(b))
