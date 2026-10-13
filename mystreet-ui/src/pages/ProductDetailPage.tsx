import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'
import { getErrorMessage, productApi } from '../api/client'
import ProductImage from '../components/ProductImage'
import { EmptyState, ErrorBanner, Spinner } from '../components/ui'
import { MAX_QTY, clampQty } from '../cart/cartReducer'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import type { Product } from '../types'
import { formatPrice, sortSizes } from '../utils/format'

export default function ProductDetailPage() {
  const { id = '' } = useParams()
  const { dispatch } = useCart()
  const { notify } = useToast()

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [size, setSize] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [sizeError, setSizeError] = useState('')
  const [added, setAdded] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setNotFound(false)
    try {
      setProduct(await productApi.get(id))
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) setNotFound(true)
      else setError(getErrorMessage(e, 'We could not load this sneaker.'))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { void load() }, [load])

  if (loading) return <Spinner label="Loading sneaker…" />
  if (notFound) return <EmptyState title="Sneaker not found" action={{ to: '/', label: 'Browse all sneakers' }}>This pair may have been removed.</EmptyState>
  if (error || !product) return <ErrorBanner message={error || 'Something went wrong.'} onRetry={load} />

  const soldOut = product.stockQty <= 0
  const maxQty = Math.min(MAX_QTY, product.stockQty)

  const addToCart = () => {
    if (!size) {
      setSizeError('Please select a size before adding to cart')
      return
    }
    dispatch({
      type: 'add',
      item: {
        productId: product.id, name: product.name, brand: product.brand, imageUrl: product.imageUrl,
        size, unitPrice: product.price, quantity: clampQty(quantity, maxQty), maxQty: product.stockQty,
      },
    })
    setAdded(true)
    notify(`${product.name} (size ${size}) added to cart`)
  }

  return (
    <section className="detail">
      <p><Link to="/" className="back-link">← All sneakers</Link></p>
      <div className="detail-grid">
        <div className="detail-media"><ProductImage src={product.imageUrl} alt={product.name} /></div>
        <div className="detail-info">
          <p className="card-brand">{product.brand}</p>
          <h1>{product.name}</h1>
          <p className="price-tag price-lg">{formatPrice(product.price)}</p>
          <p className="detail-desc">{product.description || 'No description available.'}</p>

          <fieldset className="size-picker">
            <legend>Select size</legend>
            <div className="size-options" role="radiogroup" aria-label="Available sizes">
              {sortSizes(product.sizes).map((s) => (
                <button
                  key={s} type="button" role="radio" aria-checked={size === s}
                  className={`size-chip ${size === s ? 'selected' : ''}`}
                  disabled={soldOut}
                  onClick={() => { setSize(s); setSizeError(''); setAdded(false) }}
                >{s}</button>
              ))}
            </div>
            {sizeError && <p className="field-error" role="alert">{sizeError}</p>}
          </fieldset>

          <div className="qty-row">
            <label htmlFor="qty">Quantity</label>
            <div className="qty-control">
              <button type="button" aria-label="Decrease quantity" disabled={soldOut || quantity <= 1} onClick={() => setQuantity((q) => clampQty(q - 1, maxQty))}>−</button>
              <input id="qty" type="number" min={1} max={maxQty || 1} value={quantity} disabled={soldOut}
                onChange={(e) => setQuantity(clampQty(Number(e.target.value), maxQty))} />
              <button type="button" aria-label="Increase quantity" disabled={soldOut || quantity >= maxQty} onClick={() => setQuantity((q) => clampQty(q + 1, maxQty))}>+</button>
            </div>
            <span className={`stock ${product.stockQty <= 5 ? 'stock-low' : ''}`}>
              {soldOut ? 'Out of stock' : `${product.stockQty} in stock`}
            </span>
          </div>

          <button className="btn btn-primary btn-lg" onClick={addToCart} disabled={soldOut}>
            {soldOut ? 'Sold out' : 'Add to cart'}
          </button>
          {added && (
            <p className="success-note" role="status">
              Added to your cart. <Link to="/cart">View cart</Link> or <Link to="/">keep shopping</Link>.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
