import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { EmptyState } from './ui'

export default function ProtectedRoute({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />

  if (adminOnly && !user.isAdmin) {
    return (
      <EmptyState title="Access denied" action={{ to: '/', label: 'Back to sneakers' }}>
        This area is only available to administrators.
      </EmptyState>
    )
  }
  return <>{children}</>
}
