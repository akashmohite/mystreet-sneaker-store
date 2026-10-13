import type { Order } from '../types'
import { formatDate, formatPrice, paymentLabel } from '../utils/format'
import ProductImage from './ProductImage'

export default function OrderSummary({ order }: { order: Order }) {
  return (
    <div className="order-summary">
      <dl className="meta-grid">
        <div><dt>Order ID</dt><dd className="mono" data-testid="order-id">{order.id}</dd></div>
        <div><dt>Status</dt><dd><span className="badge badge-status">{order.status}</span></dd></div>
        <div><dt>Placed</dt><dd>{formatDate(order.createdAt)}</dd></div>
        <div><dt>Payment</dt><dd>{paymentLabel(order.paymentMethod)}</dd></div>
      </dl>

      <h3>Items</h3>
      <ul className="line-items">
        {order.items.map((i, idx) => (
          <li key={`${i.productId}-${i.size}-${idx}`}>
            <ProductImage src={i.imageUrl} alt={i.productName} className="thumb" />
            <div className="li-main">
              <strong>{i.productName}</strong>
              <span className="muted">{i.brand} · Size {i.size} · Qty {i.quantity} × {formatPrice(i.unitPrice)}</span>
            </div>
            <span className="li-total">{formatPrice(i.lineTotal)}</span>
          </li>
        ))}
      </ul>
      <p className="total-row"><span>Total</span><strong>{formatPrice(order.total)}</strong></p>

      <h3>Shipping to</h3>
      <address>
        {order.shippingName}<br />
        {order.shippingAddress}<br />
        {order.shippingCity} {order.shippingPostalCode}<br />
        {order.shippingPhone}
      </address>
    </div>
  )
}
