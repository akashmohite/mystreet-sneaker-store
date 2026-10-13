import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AUTH_STORAGE_KEY, UNAUTHORIZED_EVENT, authApi } from '../api/client'
import type { AuthUser } from '../types'

interface AuthContextValue {
  user: AuthUser | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/** Reads the persisted session synchronously so a page refresh never flashes a logged-out state. */
function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const user = JSON.parse(raw) as AuthUser
    if (!user?.token || !user.email) return null
    if (user.expiresAt && new Date(user.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      return null
    }
    return user
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readStoredUser)

  const persist = useCallback((next: AuthUser | null) => {
    if (next) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next))
    else localStorage.removeItem(AUTH_STORAGE_KEY)
    setUser(next)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    persist(await authApi.login(email.trim(), password))
  }, [persist])

  const register = useCallback(async (email: string, password: string) => {
    persist(await authApi.register(email.trim(), password))
  }, [persist])

  const logout = useCallback(async () => {
    try { await authApi.logout() } catch { /* stateless JWT: client-side logout always succeeds */ }
    persist(null)
  }, [persist])

  // Token rejected by the API (expired/invalid) -> drop the session.
  useEffect(() => {
    const onUnauthorized = () => persist(null)
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [persist])

  // Keep multiple tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === AUTH_STORAGE_KEY) setUser(readStoredUser()) }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const value = useMemo(() => ({ user, login, register, logout }), [user, login, register, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
