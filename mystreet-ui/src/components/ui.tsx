import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="spinner-wrap" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="banner banner-error" role="alert">
      <span>{message}</span>
      {onRetry && <button className="btn btn-ghost btn-sm" onClick={onRetry}>Try again</button>}
    </div>
  )
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: { to: string; label: string } }) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action && <Link to={action.to} className="btn btn-primary">{action.label}</Link>}
    </div>
  )
}

export function Field({ label, error, children, htmlFor }: { label: string; error?: string; children: ReactNode; htmlFor: string }) {
  return (
    <div className={`field ${error ? 'field-invalid' : ''}`}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error && <p className="field-error" id={`${htmlFor}-error`} role="alert">{error}</p>}
    </div>
  )
}
