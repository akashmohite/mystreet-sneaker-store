import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getErrorMessage, orderApi } from '../api/client'
import OrderSummary from '../components/OrderSummary'
import { ErrorBanner, Spinner } from '../components/ui'
import type { Order } from '../types'

export default function OrderDetailPage() {
  const { id = '' } = useParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setOrder(await orderApi.get(id)) }
    catch (e) { setError(getErrorMessage(e, 'We could not load this order.')) }
    finally { setLoading(false) }
  }, [id])
  useEffect(() => { void load() }, [load])

  return (
    <section>
      <p><Link to="/orders" className="back-link">← My orders</Link></p>
      <div className="page-head"><h1>Order details</h1></div>
      {loading && <Spinner label="Loading order…" />}
      {!loading && (error || !order) && <ErrorBanner message={error || 'Order not found'} onRetry={load} />}
      {!loading && order && <div className="card pad"><OrderSummary order={order} /></div>}
    </section>
  )
}
