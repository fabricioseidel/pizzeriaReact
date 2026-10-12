import { useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useStore } from '../context/StoreContext'
import { PAYMENT_METHODS } from '../lib/defaults'
import { money } from '../lib/format'

export default function Checkout() {
  const { api, user, cart, cartItems, catalog, clearCart, notify } = useStore()
  const navigate = useNavigate()
  const s = catalog.settings
  const [form, setForm] = useState({
    name: user.name || '',
    phone: user.phone || '',
    address: user.address || '',
    reference: '',
    paymentMethod: 'efectivo',
    notes: '',
  })
  const [inZone, setInZone] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const placed = useRef(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  // tras confirmar se vacía el carrito: no redirigir al inicio mientras navegamos a "Mis pedidos"
  if (!cart.lines.length) return placed.current ? null : <Navigate to="/" replace />

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const order = await api.placeOrder({ items: cartItems, customer: form })
      placed.current = true
      navigate(`/mi-cuenta?pedido=${order.id}`, { replace: true })
      clearCart()
      notify('¡Pedido recibido! 🎉')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="page container">
      <h1 className="page-title">Confirmar pedido</h1>
      <div className="checkout">
        <form className="form card" onSubmit={submit}>
          <h3>Datos de entrega</h3>
          <label>Nombre<input required value={form.name} onChange={set('name')} /></label>
          <label>Teléfono<input type="tel" required value={form.phone} onChange={set('phone')} /></label>
          <label>Dirección (calle, número, depto)<input required value={form.address} onChange={set('address')} /></label>
          <div className="row2">
            <label>Comuna<input value={s.deliveryZone} disabled /></label>
            <label>Referencia<input placeholder="Ej: portón verde" value={form.reference} onChange={set('reference')} /></label>
          </div>
          <label className="check">
            <input type="checkbox" required checked={inZone} onChange={(e) => setInZone(e.target.checked)} />
            Confirmo que mi dirección está en {s.deliveryZone} (solo hacemos delivery ahí)
          </label>

          <h3>Pago</h3>
          <div className="radio-group">
            {PAYMENT_METHODS.map((m) => (
              <label key={m.id} className={`radio ${form.paymentMethod === m.id ? 'on' : ''}`}>
                <input type="radio" name="pay" value={m.id} checked={form.paymentMethod === m.id} onChange={set('paymentMethod')} />
                {m.label}
              </label>
            ))}
          </div>
          {form.paymentMethod === 'transferencia' && (
            <p className="info-box">{s.transferInfo || 'Te enviaremos los datos de transferencia al confirmar tu pedido.'}</p>
          )}
          <label>Comentarios<textarea rows="3" maxLength={500} placeholder="Ej: sin orégano, tocar el timbre 2 veces" value={form.notes} onChange={set('notes')} /></label>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-red btn-big btn-block" disabled={busy || !s.storeOpen || cart.problems.length > 0}>
            {!s.storeOpen ? 'Estamos cerrados' : busy ? 'Enviando…' : `Confirmar pedido · ${money(cart.total)}`}
          </button>
        </form>

        <aside className="card summary">
          <h3>Resumen</h3>
          <ul className="summary-lines">
            {cart.lines.map((l) => (
              <li key={l.key}>
                <span>
                  {l.qty} × {l.name}{l.size ? ` (${l.size})` : ''}
                  {l.extrasNames && <small>{l.extrasNames.join(', ')}</small>}
                </span>
                <span>{money(l.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="totals">
            <div><span>Subtotal</span><span>{money(cart.subtotal)}</span></div>
            {cart.discount > 0 && <div className="discount"><span>Promo 2 x {money(s.promoPrice)}</span><span>−{money(cart.discount)}</span></div>}
            <div><span>Delivery {s.deliveryZone}</span><span>{money(cart.deliveryFee)}</span></div>
            <div className="grand"><span>Total</span><span>{money(cart.total)}</span></div>
          </div>
          <Link to="/#menu" className="link">← Seguir agregando</Link>
        </aside>
      </div>
    </section>
  )
}
