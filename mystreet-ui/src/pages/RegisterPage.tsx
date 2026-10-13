import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { getErrorMessage } from '../api/client'
import { ErrorBanner, Field } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { validateRegister, type Errors } from '../utils/validation'

export default function RegisterPage() {
  const { user, register } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [values, setValues] = useState({ email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState<Errors<typeof values>>({})
  const [serverError, setServerError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={from} replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const found = validateRegister(values)
    setErrors(found)
    setServerError('')
    if (Object.keys(found).length) return
    setBusy(true)
    try {
      await register(values.email, values.password)
      notify('Account created - you are signed in')
      navigate(from, { replace: true })
    } catch (err) {
      setServerError(getErrorMessage(err, 'Registration failed. Please try again.'))
      setBusy(false)
    }
  }

  return (
    <section className="auth-card card pad">
      <h1>Create account</h1>
      {serverError && <ErrorBanner message={serverError} />}
      <form onSubmit={onSubmit} noValidate aria-label="Registration form">
        <Field label="Email" htmlFor="email" error={errors.email}>
          <input id="email" type="email" autoComplete="username" value={values.email}
            onChange={(e) => setValues({ ...values, email: e.target.value })} aria-invalid={!!errors.email} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password}>
          <input id="password" type="password" autoComplete="new-password" value={values.password}
            onChange={(e) => setValues({ ...values, password: e.target.value })} aria-invalid={!!errors.password} />
        </Field>
        <Field label="Confirm password" htmlFor="confirm" error={errors.confirm}>
          <input id="confirm" type="password" autoComplete="new-password" value={values.confirm}
            onChange={(e) => setValues({ ...values, confirm: e.target.value })} aria-invalid={!!errors.confirm} />
        </Field>
        <p className="muted small">8+ characters, with at least one letter and one number.</p>
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Register'}</button>
      </form>
      <p className="muted">Already registered? <Link to="/login" state={{ from }}>Log in</Link></p>
    </section>
  )
}
