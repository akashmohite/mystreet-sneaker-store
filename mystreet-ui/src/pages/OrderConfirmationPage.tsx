import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getErrorMessage, orderApi } from '../api/client'
import OrderSummary from '../components/OrderSummary'
import { ErrorBanner, Spinner } from '../components/ui'
import type { Order } from '../types'

export default function OrderConfirmationPage() {
  const { id = '' } = useParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setOrder(await orderApi.get(id)) }
    catch (e) { setError(getErrorMessage(e, 'We could not load your order.')) }
    finally { setLoading(false) }
  }, [id])
  useEffect(() => { void load() }, [load])

  if (loading) return <Spinner label="Loading your order…" />
  if (error || !order) return <ErrorBanner message={error || 'Order not found'} onRetry={load} />

  return (
    <section className="confirmation">
      <div className="success-hero" role="status">
        <h1>Order successfully placed</h1>
        <p>Thanks! Your order <strong className="mono">{order.id}</strong> is {order.status}.</p>
      </div>
      <div className="card pad"><OrderSummary order={order} /></div>
      <p className="actions">
        <Link to="/orders" className="btn btn-primary">View my orders</Link>
        <Link to="/" className="btn btn-ghost">Continue shopping</Link>
      </p>
    </section>
  )
}
