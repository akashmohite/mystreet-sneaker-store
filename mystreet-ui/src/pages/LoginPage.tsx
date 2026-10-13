import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { getErrorMessage } from '../api/client'
import { ErrorBanner, Field } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { validateLogin, type Errors } from '../utils/validation'

export default function LoginPage() {
  const { user, login } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [values, setValues] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<Errors<typeof values>>({})
  const [serverError, setServerError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={from} replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const found = validateLogin(values)
    setErrors(found)
    setServerError('')
    if (Object.keys(found).length) return
    setBusy(true)
    try {
      await login(values.email, values.password)
      notify('Welcome back!')
      navigate(from, { replace: true })
    } catch (err) {
      setServerError(getErrorMessage(err, 'Login failed. Please try again.'))
      setBusy(false)
    }
  }

  return (
    <section className="auth-card card pad">
      <h1>Log in</h1>
      {from === '/checkout' && <p className="muted">Please log in to complete your order. Your cart is saved.</p>}
      {serverError && <ErrorBanner message={serverError} />}
      <form onSubmit={onSubmit} noValidate aria-label="Login form">
        <Field label="Email" htmlFor="email" error={errors.email}>
          <input id="email" type="email" autoComplete="username" value={values.email}
            onChange={(e) => setValues({ ...values, email: e.target.value })} aria-invalid={!!errors.email} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password}>
          <input id="password" type="password" autoComplete="current-password" value={values.password}
            onChange={(e) => setValues({ ...values, password: e.target.value })} aria-invalid={!!errors.password} />
        </Field>
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Log in'}</button>
      </form>
      <p className="muted">New here? <Link to="/register" state={{ from }}>Create an account</Link></p>
    </section>
  )
}
