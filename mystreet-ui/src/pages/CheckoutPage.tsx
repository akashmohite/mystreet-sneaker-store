import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getErrorMessage, orderApi } from '../api/client'
import { EmptyState, ErrorBanner, Field } from '../components/ui'
import { lineTotal } from '../cart/cartReducer'
import { useCart } from '../context/CartContext'
import type { PaymentMethod, ShippingValues } from '../types'
import { formatPrice } from '../utils/format'
import { validateShipping, type Errors } from '../utils/validation'

const EMPTY: ShippingValues = {
  shippingName: '', shippingAddress: '', shippingCity: '', shippingPostalCode: '', shippingPhone: '',
}

export default function CheckoutPage() {
  const { items, total, dispatch } = useCart()
  const navigate = useNavigate()
  const [values, setValues] = useState<ShippingValues>(EMPTY)
  const [errors, setErrors] = useState<Errors<ShippingValues>>({})
  const [payment, setPayment] = useState<PaymentMethod>('COD')
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')

  if (items.length === 0) {
    return (
      <EmptyState title="Your cart is empty" action={{ to: '/', label: 'Browse sneakers' }}>
        Add something to your cart before checking out.
      </EmptyState>
    )
  }

  const set = (key: keyof ShippingValues) => (e: { target: { value: string } }) => {
    setValues((v) => ({ ...v, [key]: e.target.value }))
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }))
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setServerError('')

    const found = validateShipping(values)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSubmitting(true)
    try {
      // Only ids, sizes and quantities are sent. Prices and totals are computed by the server.
      const order = await orderApi.create({
        ...values,
        paymentMethod: payment,
        items: items.map((i) => ({ productId: i.productId, size: i.size, quantity: i.quantity })),
      })
      dispatch({ type: 'clear' }) // only after the order succeeded
      navigate(`/order-confirmation/${order.id}`, { replace: true })
    } catch (err) {
      setServerError(getErrorMessage(err, 'We could not place your order. Your cart is unchanged - please try again.'))
      setSubmitting(false)
    }
  }

  return (
    <section>
      <div className="page-head"><h1>Checkout</h1></div>
      <div className="checkout-grid">
        <form onSubmit={onSubmit} noValidate aria-label="Checkout form">
          {serverError && <ErrorBanner message={serverError} />}

          <h2 className="h-sm">Shipping address</h2>
          <Field label="Full name" htmlFor="name" error={errors.shippingName}>
            <input id="name" autoComplete="name" value={values.shippingName} onChange={set('shippingName')} maxLength={100} aria-invalid={!!errors.shippingName} />
          </Field>
          <Field label="Address" htmlFor="address" error={errors.shippingAddress}>
            <input id="address" autoComplete="street-address" value={values.shippingAddress} onChange={set('shippingAddress')} maxLength={300} aria-invalid={!!errors.shippingAddress} />
          </Field>
          <div className="two-col">
            <Field label="City" htmlFor="city" error={errors.shippingCity}>
              <input id="city" autoComplete="address-level2" value={values.shippingCity} onChange={set('shippingCity')} maxLength={100} aria-invalid={!!errors.shippingCity} />
            </Field>
            <Field label="Postal code" htmlFor="postal" error={errors.shippingPostalCode}>
              <input id="postal" autoComplete="postal-code" value={values.shippingPostalCode} onChange={set('shippingPostalCode')} maxLength={10} aria-invalid={!!errors.shippingPostalCode} />
            </Field>
          </div>
          <Field label="Phone" htmlFor="phone" error={errors.shippingPhone}>
            <input id="phone" type="tel" autoComplete="tel" value={values.shippingPhone} onChange={set('shippingPhone')} maxLength={20} aria-invalid={!!errors.shippingPhone} />
          </Field>

          <fieldset className="payment">
            <legend className="h-sm">Payment</legend>
            <label className={`pay-option ${payment === 'COD' ? 'selected' : ''}`}>
              <input type="radio" name="payment" value="COD" checked={payment === 'COD'} onChange={() => setPayment('COD')} />
              <span><strong>Cash on Delivery</strong><small>Pay when your sneakers arrive</small></span>
            </label>
            <label className={`pay-option ${payment === 'UPI' ? 'selected' : ''}`}>
              <input type="radio" name="payment" value="UPI" checked={payment === 'UPI'} onChange={() => setPayment('UPI')} />
              <span><strong>UPI (mock)</strong><small>Simulated payment - always succeeds, nothing is charged</small></span>
            </label>
          </fieldset>

          <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={submitting}>
            {submitting ? 'Placing order…' : `Place order · ${formatPrice(total)}`}
          </button>
        </form>

        <aside className="card summary" aria-label="Order summary">
          <h2 className="h-sm">Order summary</h2>
          <ul className="line-items compact">
            {items.map((i) => (
              <li key={`${i.productId}-${i.size}`}>
                <div className="li-main"><strong>{i.name}</strong><span className="muted">Size {i.size} · Qty {i.quantity}</span></div>
                <span className="li-total">{formatPrice(lineTotal(i))}</span>
              </li>
            ))}
          </ul>
          <p className="total-row"><span>Total</span><strong>{formatPrice(total)}</strong></p>
          <p className="muted small">Final prices are confirmed by our server when you place the order.</p>
          <Link to="/cart" className="back-link">← Edit cart</Link>
        </aside>
      </div>
    </section>
  )
}
