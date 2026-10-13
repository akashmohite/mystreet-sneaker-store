import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getErrorMessage, productApi } from '../api/client'
import ProductCard from '../components/ProductCard'
import { EmptyState, ErrorBanner, Spinner } from '../components/ui'
import type { Product } from '../types'
import { sortSizes } from '../utils/format'

export default function ProductsPage() {
  const [params, setParams] = useSearchParams()
  const brand = params.get('brand') ?? ''
  const size = params.get('size') ?? ''

  const [catalog, setCatalog] = useState<Product[]>([]) // unfiltered, only used to build the filter options
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [all, filtered] = await Promise.all([
        productApi.list(),
        brand || size ? productApi.list({ brand: brand || undefined, size: size || undefined }) : null,
      ])
      setCatalog(all)
      setProducts(filtered ?? all)
    } catch (e) {
      setError(getErrorMessage(e, 'We could not load the sneakers right now.'))
    } finally {
      setLoading(false)
    }
  }, [brand, size])

  useEffect(() => { void load() }, [load])

  const brands = useMemo(() => [...new Set(catalog.map((p) => p.brand))].sort(), [catalog])
  const sizes = useMemo(() => sortSizes([...new Set(catalog.flatMap((p) => p.sizes))]), [catalog])

  const setFilter = (key: 'brand' | 'size', value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  return (
    <section>
      <div className="hero">
        <div className="hero-copy">
          <span className="hero-kicker">New season drop</span>
          <h1>Sneakers for the street</h1>
          <p>Classics and everyday icons from Nike, Jordan, Adidas, New Balance, Converse, Vans, Puma, Reebok, Asics and Saucony. Pick a pair, choose your size, and we'll get it moving.</p>
          <a className="btn btn-primary btn-lg" href="#catalog">Shop the collection</a>
        </div>
        <ul className="hero-points" aria-label="Store benefits">
          <li><strong>50</strong> iconic pairs, 10 brands</li>
          <li><strong>Simple</strong> checkout: Cash on Delivery or UPI</li>
          <li><strong>Live</strong> stock and order tracking</li>
        </ul>
      </div>

      <div id="catalog" className="filters" role="search" aria-label="Filter sneakers">
        <div className="field-inline">
          <label htmlFor="brand-filter">Brand</label>
          <select id="brand-filter" value={brand} onChange={(e) => setFilter('brand', e.target.value)}>
            <option value="">All brands</option>
            {brands.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="field-inline">
          <label htmlFor="size-filter">Size</label>
          <select id="size-filter" value={size} onChange={(e) => setFilter('size', e.target.value)}>
            <option value="">All sizes</option>
            {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {(brand || size) && (
          <button className="btn btn-ghost btn-sm" onClick={() => setParams({}, { replace: true })}>Clear filters</button>
        )}
        {!loading && !error && <span className="result-count" aria-live="polite">{products.length} {products.length === 1 ? 'pair' : 'pairs'}</span>}
      </div>

      {loading && <Spinner label="Loading sneakers…" />}
      {!loading && error && <ErrorBanner message={error} onRetry={load} />}
      {!loading && !error && products.length === 0 && (
        <EmptyState title="No sneakers match those filters">
          Try a different brand or size.
        </EmptyState>
      )}
      {!loading && !error && products.length > 0 && (
        <div className="grid">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </section>
  )
}
