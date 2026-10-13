import { Link } from 'react-router-dom'
import type { Product } from '../types'
import { formatPrice, sortSizes } from '../utils/format'
import ProductImage from './ProductImage'

export default function ProductCard({ product }: { product: Product }) {
  const soldOut = product.stockQty <= 0
  return (
    <article className="card product-card">
      <Link to={`/products/${product.id}`} className="card-media" aria-label={`View ${product.name}`}>
        <ProductImage src={product.imageUrl} alt={product.name} />
        {soldOut && <span className="badge badge-out">Sold out</span>}
      </Link>
      <div className="card-body">
        <p className="card-brand">{product.brand}</p>
        <h3 className="card-title"><Link to={`/products/${product.id}`}>{product.name}</Link></h3>
        <p className="card-sizes">Sizes {sortSizes(product.sizes).join(' · ')}</p>
        <div className="card-foot">
          <span className="price-tag">{formatPrice(product.price)}</span>
          <span className={`stock ${product.stockQty <= 5 ? 'stock-low' : ''}`}>
            {soldOut ? 'Out of stock' : product.stockQty <= 5 ? `Only ${product.stockQty} left` : `${product.stockQty} in stock`}
          </span>
        </div>
        <Link to={`/products/${product.id}`} className="btn btn-primary btn-block">
          {soldOut ? 'View details' : 'Choose size'}
        </Link>
      </div>
    </article>
  )
}
