import { useState } from 'react'
import { Link, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../context/StoreContext'
import { money } from '../lib/format'
import PizzaArt from './PizzaArt'

const LOGO_TOPPINGS = [{ id: 'pepperoni', visual: 'pepperoni' }]

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="tupizzita.cl inicio">
      <PizzaArt toppings={LOGO_TOPPINGS} size={38} className="logo-pizza" />
      <span>tu<b>pizzita</b><small>.cl</small></span>
    </Link>
  )
}

export function Navbar() {
  const { user, isAdmin, cart, setCartOpen, api, notify } = useStore()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const close = () => setOpen(false)

  async function logout() {
    await api.logout()
    close()
    notify('Sesión cerrada')
    navigate('/')
  }

  return (
    <header className="nav">
      <div className="nav-inner">
        <Logo />
        <nav className={`nav-links ${open ? 'open' : ''}`} onClick={close}>
          <Link to="/#menu">Menú</Link>
          <Link to="/#arma">Arma tu pizza</Link>
          <Link to="/#bebidas">Bebidas</Link>
          {user && <NavLink to="/mi-cuenta">Mis pedidos</NavLink>}
          {isAdmin && <NavLink to="/admin" className="nav-admin">Administración</NavLink>}
          {user ? (
            <button className="link-btn" onClick={logout}>Salir</button>
          ) : (
            <>
              <NavLink to="/login">Ingresar</NavLink>
              <NavLink to="/registro" className="btn btn-small btn-yellow">Registrarse</NavLink>
            </>
          )}
        </nav>
        <button className="cart-btn" onClick={() => setCartOpen(true)} aria-label="Abrir carrito">
          <span aria-hidden>🛒</span>
          {cart?.count > 0 && <span className="badge">{cart.count}</span>}
          <span className="cart-total">{money(cart?.total)}</span>
        </button>
        <button className="burger" onClick={() => setOpen(!open)} aria-label="Menú" aria-expanded={open}>
          <span /><span /><span />
        </button>
      </div>
    </header>
  )
}

export function Footer() {
  const { catalog, api } = useStore()
  const s = catalog?.settings
  return (
    <footer className="footer">
      <div className="checker" />
      <div className="footer-inner">
        <div>
          <Logo />
          <p>Pizza artesanal casera de masa madre.<br />Solo delivery en {s?.deliveryZone || 'Macul'}.</p>
        </div>
        <div>
          <h4>Horario</h4>
          <p>{s?.hours}</p>
          <p>{s?.storeOpen ? '🟢 Recibiendo pedidos' : '🔴 Cerrado por ahora'}</p>
        </div>
        <div>
          <h4>Contacto</h4>
          {s?.whatsapp ? (
            <p><a href={`https://wa.me/${s.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">WhatsApp {s.whatsapp}</a></p>
          ) : (
            <p>Pide directo desde esta página 🍕</p>
          )}
          <p>tupizzita.cl</p>
        </div>
      </div>
      <p className="footer-bottom">
        © {new Date().getFullYear()} tupizzita.cl · Hecho con masa madre y cariño
        {api?.mode === 'demo' && <span className="demo-tag" title="Los datos se guardan en este navegador">modo demo</span>}
      </p>
    </footer>
  )
}

export function CartDrawer() {
  const { cart, cartOpen, setCartOpen, setQty, catalog, user } = useStore()
  const navigate = useNavigate()
  if (!cart) return null
  const s = catalog.settings

  function checkout() {
    setCartOpen(false)
    navigate(user ? '/checkout' : '/login?next=/checkout')
  }

  return (
    <>
      <div className={`overlay ${cartOpen ? 'show' : ''}`} onClick={() => setCartOpen(false)} />
      <aside className={`drawer ${cartOpen ? 'open' : ''}`} aria-hidden={!cartOpen}>
        <div className="drawer-head">
          <h3>Tu pedido</h3>
          <button className="icon-btn" onClick={() => setCartOpen(false)} aria-label="Cerrar">✕</button>
        </div>
        {cart.lines.length === 0 ? (
          <div className="empty">
            <PizzaArt toppings={[]} size={120} />
            <p>Tu carrito está vacío.<br />¡Elige una pizza!</p>
          </div>
        ) : (
          <>
            <ul className="cart-lines">
              {cart.lines.map((l) => (
                <li key={l.key} className={l.unavailable ? 'unavailable' : ''}>
                  <div>
                    <strong>{l.name}</strong>
                    {l.size && <small> · {l.size}</small>}
                    {l.extrasNames && <small className="extras">{l.extrasNames.join(', ') || 'Sin ingredientes'}</small>}
                    {l.unavailable && <small className="warn">No disponible, quítalo del carrito</small>}
                    <span className="unit">{money(l.unitPrice)} c/u</span>
                  </div>
                  <div className="qty">
                    <button onClick={() => setQty(l.key, l.qty - 1)} aria-label="Quitar uno">−</button>
                    <span>{l.qty}</span>
                    <button onClick={() => setQty(l.key, l.qty + 1)} aria-label="Agregar uno">+</button>
                  </div>
                </li>
              ))}
            </ul>
            {s.promoEnabled && cart.promoLeftover && (
              <p className="promo-hint">🔥 Agrega 1 pizza más del menú y paga {money(s.promoPrice)} por el par.</p>
            )}
            <div className="totals">
              <div><span>Subtotal</span><span>{money(cart.subtotal)}</span></div>
              {cart.discount > 0 && (
                <div className="discount"><span>Promo 2 x {money(s.promoPrice)}</span><span>−{money(cart.discount)}</span></div>
              )}
              <div><span>Delivery {s.deliveryZone}</span><span>{money(cart.deliveryFee)}</span></div>
              <div className="grand"><span>Total</span><span>{money(cart.total)}</span></div>
            </div>
            <button className="btn btn-red btn-block" onClick={checkout} disabled={cart.problems.length > 0 || !s.storeOpen}>
              {s.storeOpen ? 'Ir a pagar' : 'Estamos cerrados'}
            </button>
          </>
        )}
      </aside>
    </>
  )
}

export function Toast() {
  const { toast } = useStore()
  if (!toast) return null
  return <div key={toast.id} className={`toast toast-${toast.type}`} role="status">{toast.message}</div>
}

export function RequireAuth({ children, admin = false }) {
  const { user, isAdmin } = useStore()
  const loc = useLocation()
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />
  if (admin && !isAdmin) return <Navigate to="/" replace />
  return children
}
