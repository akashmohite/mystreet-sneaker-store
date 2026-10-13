import { Link, useNavigate } from 'react-router-dom'
import ProductImage from '../components/ProductImage'
import { EmptyState } from '../components/ui'
import { lineTotal } from '../cart/cartReducer'
import { useCart } from '../context/CartContext'
import { formatPrice } from '../utils/format'

export default function CartPage() {
  const { items, total, count, dispatch } = useCart()
  const navigate = useNavigate()

  if (items.length === 0) {
    return (
      <EmptyState title="Your cart is empty" action={{ to: '/', label: 'Browse sneakers' }}>
        Add a pair you like and it will show up here.
      </EmptyState>
    )
  }

  return (
    <section>
      <div className="page-head"><h1>Your cart</h1><p className="muted">{count} {count === 1 ? 'item' : 'items'}</p></div>
      <div className="table-wrap">
        <table className="table cart-table">
          <thead>
            <tr><th>Product</th><th>Size</th><th>Price</th><th>Quantity</th><th>Total</th><th><span className="sr-only">Remove</span></th></tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={`${i.productId}-${i.size}`}>
                <td>
                  <div className="cell-product">
                    <ProductImage src={i.imageUrl} alt={i.name} className="thumb" />
                    <div><Link to={`/products/${i.productId}`}><strong>{i.name}</strong></Link><div className="muted">{i.brand}</div></div>
                  </div>
                </td>
                <td data-label="Size">{i.size}</td>
                <td data-label="Price">{formatPrice(i.unitPrice)}</td>
                <td data-label="Quantity">
                  <div className="qty-control">
                    <button aria-label={`Decrease quantity of ${i.name}`} disabled={i.quantity <= 1}
                      onClick={() => dispatch({ type: 'setQty', productId: i.productId, size: i.size, quantity: i.quantity - 1 })}>−</button>
                    <input aria-label={`Quantity of ${i.name}`} type="number" min={1} value={i.quantity}
                      onChange={(e) => dispatch({ type: 'setQty', productId: i.productId, size: i.size, quantity: Number(e.target.value) })} />
                    <button aria-label={`Increase quantity of ${i.name}`} disabled={i.quantity >= Math.min(10, i.maxQty)}
                      onClick={() => dispatch({ type: 'setQty', productId: i.productId, size: i.size, quantity: i.quantity + 1 })}>+</button>
                  </div>
                </td>
                <td data-label="Total"><strong>{formatPrice(lineTotal(i))}</strong></td>
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={() => dispatch({ type: 'remove', productId: i.productId, size: i.size })}
                    aria-label={`Remove ${i.name} size ${i.size}`}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="cart-footer">
        <Link to="/" className="btn btn-ghost">Continue shopping</Link>
        <div className="cart-total">
          <span>Total</span><strong data-testid="cart-total">{formatPrice(total)}</strong>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/checkout')}>Checkout</button>
        </div>
      </div>
    </section>
  )
}
