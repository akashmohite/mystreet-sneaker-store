import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'

export default function Header() {
  const { user, logout } = useAuth()
  const { count } = useCart()
  const { notify } = useToast()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const close = () => setOpen(false)
  const onLogout = async () => {
    await logout()
    close()
    notify('You have been signed out', 'info')
    navigate('/')
  }

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="brand" onClick={close} aria-label="MyStreeT home">
          My<span>Stree</span>T
        </Link>
        <button className="nav-toggle" aria-expanded={open} aria-controls="main-nav" onClick={() => setOpen((o) => !o)}>
          Menu
        </button>
        <nav id="main-nav" className={`nav ${open ? 'open' : ''}`} aria-label="Main">
          <NavLink to="/" end onClick={close}>Sneakers</NavLink>
          {user && <NavLink to="/orders" onClick={close}>My Orders</NavLink>}
          {user?.isAdmin && <NavLink to="/admin/products" onClick={close}>Admin</NavLink>}
          <NavLink to="/cart" className="cart-link" onClick={close}>
            Cart
            <span className="cart-badge" aria-label={`${count} items in cart`} data-testid="cart-count">{count}</span>
          </NavLink>
          {user ? (
            <>
              <span className="nav-user" title={user.email}>{user.email}</span>
              <button className="btn btn-ghost btn-sm" onClick={onLogout}>Logout</button>
            </>
          ) : (
            <>
              <NavLink to="/login" onClick={close}>Login</NavLink>
              <Link to="/register" className="btn btn-primary btn-sm" onClick={close}>Register</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
