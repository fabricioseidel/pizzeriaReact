import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useStore } from '../context/StoreContext'
import { ORDER_STATUSES, PAYMENT_METHODS } from '../lib/defaults'
import { dateTime, money } from '../lib/format'
import { usePolling } from '../lib/usePolling'

export function StatusTracker({ status }) {
  if (status === 'cancelado') return <div className="status-cancel">✖️ Pedido cancelado</div>
  const steps = ORDER_STATUSES.filter((s) => s.id !== 'cancelado')
  const current = steps.findIndex((s) => s.id === status)
  return (
    <ol className="tracker">
      {steps.map((s, i) => (
        <li key={s.id} className={i < current ? 'done' : i === current ? 'now' : ''}>
          <span className="tracker-dot">{s.emoji}</span>
          <span>{s.label}</span>
        </li>
      ))}
    </ol>
  )
}

export function OrderItems({ order }) {
  return (
    <ul className="summary-lines">
      {order.items.map((l, i) => (
        <li key={i}>
          <span>
            {l.qty} × {l.name}{l.size ? ` (${l.size})` : ''}
            {l.extras && <small>{l.extras.join(', ')}</small>}
          </span>
          <span>{money(l.lineTotal)}</span>
        </li>
      ))}
      {order.discount > 0 && <li className="discount"><span>Promo</span><span>−{money(order.discount)}</span></li>}
      <li><span>Delivery</span><span>{money(order.deliveryFee)}</span></li>
      <li className="grand"><span>Total</span><span>{money(order.total)}</span></li>
    </ul>
  )
}

export const paymentLabel = (id) => PAYMENT_METHODS.find((m) => m.id === id)?.label || id

export default function Account() {
  const { api, user, setUser, notify, catalog } = useStore()
  const [params] = useSearchParams()
  const highlight = params.get('pedido')
  const [orders, setOrders] = useState(null)
  const [form, setForm] = useState({ name: user.name, phone: user.phone, address: user.address })
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => api.myOrders().then(setOrders).catch(() => {}), [api])
  useEffect(() => { load() }, [load])
  usePolling(load, 15000)

  async function saveProfile(e) {
    e.preventDefault()
    setSaving(true)
    try {
      setUser(await api.updateProfile(form))
      notify('Datos actualizados')
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const active = orders?.filter((o) => !['entregado', 'cancelado'].includes(o.status)) || []
  const past = orders?.filter((o) => ['entregado', 'cancelado'].includes(o.status)) || []

  return (
    <section className="page container">
      <h1 className="page-title">Hola, {user.name.split(' ')[0]} 👋</h1>
      {highlight && (
        <div className="success-box">
          🎉 ¡Recibimos tu pedido! Ya lo estamos preparando. Esta página se actualiza sola.
          {catalog.settings.transferInfo && orders?.find((o) => o.id === highlight)?.paymentMethod === 'transferencia' && (
            <p><strong>Datos de transferencia:</strong> {catalog.settings.transferInfo}</p>
          )}
        </div>
      )}
      <div className="account">
        <div>
          <h2 className="sub-title">Pedidos en curso</h2>
          {orders === null && <p className="muted">Cargando…</p>}
          {orders && active.length === 0 && <p className="muted">No tienes pedidos en curso.</p>}
          {active.map((o) => (
            <article key={o.id} className={`card order ${o.id === highlight ? 'highlight' : ''}`}>
              <header>
                <strong>Pedido #{o.number}</strong>
                <span className="muted">{dateTime(o.createdAt)}</span>
              </header>
              <StatusTracker status={o.status} />
              <OrderItems order={o} />
              <p className="muted small">📍 {o.address} · 💳 {paymentLabel(o.paymentMethod)}</p>
            </article>
          ))}
          {past.length > 0 && <h2 className="sub-title">Historial</h2>}
          {past.map((o) => (
            <details key={o.id} className="card order past">
              <summary>
                <strong>#{o.number}</strong>
                <span className="muted">{dateTime(o.createdAt)}</span>
                <span className={`status-pill st-${o.status}`}>{ORDER_STATUSES.find((s) => s.id === o.status)?.label}</span>
                <span>{money(o.total)}</span>
              </summary>
              <OrderItems order={o} />
            </details>
          ))}
        </div>
        <form className="card form" onSubmit={saveProfile}>
          <h3>Mis datos</h3>
          <label>Nombre<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Correo<input value={user.email} disabled /></label>
          <label>Teléfono<input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          <label>Dirección<input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
          <button className="btn btn-red btn-block" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
        </form>
      </div>
    </section>
  )
}
