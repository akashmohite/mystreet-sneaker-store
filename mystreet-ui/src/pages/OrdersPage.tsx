import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getErrorMessage, orderApi } from '../api/client'
import { EmptyState, ErrorBanner, Spinner } from '../components/ui'
import type { Order } from '../types'
import { formatDate, formatPrice, paymentLabel } from '../utils/format'

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setOrders(await orderApi.mine()) }
    catch (e) { setError(getErrorMessage(e, 'We could not load your orders.')) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  if (loading) return <Spinner label="Loading your orders…" />
  if (error) return <ErrorBanner message={error} onRetry={load} />
  if (orders.length === 0)
    return <EmptyState title="No orders yet" action={{ to: '/', label: 'Start shopping' }}>When you place an order it will appear here.</EmptyState>

  return (
    <section>
      <div className="page-head"><h1>My orders</h1></div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Order</th><th>Placed</th><th>Items</th><th>Payment</th><th>Status</th><th>Total</th><th /></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="mono" data-label="Order">{o.id.slice(0, 8)}…</td>
                <td data-label="Placed">{formatDate(o.createdAt)}</td>
                <td data-label="Items">{o.items.reduce((n, i) => n + i.quantity, 0)}</td>
                <td data-label="Payment">{paymentLabel(o.paymentMethod)}</td>
                <td data-label="Status"><span className="badge badge-status">{o.status}</span></td>
                <td data-label="Total"><strong>{formatPrice(o.total)}</strong></td>
                <td><Link to={`/orders/${o.id}`} className="btn btn-ghost btn-sm">View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
