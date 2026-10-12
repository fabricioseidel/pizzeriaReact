import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { useStore } from '../../context/StoreContext'
import { ORDER_STATUSES } from '../../lib/defaults'
import { dateTime, isToday, money } from '../../lib/format'
import { usePolling } from '../../lib/usePolling'
import { OrderItems, paymentLabel } from '../Account'
import PizzaArt from '../../components/PizzaArt'

const ACTIVE = ['recibido', 'preparando', 'en_camino']
const statusLabel = (id) => ORDER_STATUSES.find((s) => s.id === id)?.label || id

// Pedidos compartidos por todas las vistas del panel, con refresco automático.
function useOrders() {
  const { api, notify } = useStore()
  const [orders, setOrders] = useState(null)
  const known = useRef(null)
  const load = useCallback(async () => {
    try {
      const list = await api.allOrders()
      if (known.current && list.some((o) => !known.current.has(o.id))) notify('🔔 ¡Llegó un pedido nuevo!')
      known.current = new Set(list.map((o) => o.id))
      setOrders(list)
    } catch (err) {
      notify(err.message, 'error')
    }
  }, [api, notify])
  useEffect(() => { load() }, [load])
  usePolling(load, 15000)
  return [orders, load]
}

export default function Admin() {
  const { api } = useStore()
  const [orders, reload] = useOrders()
  const pending = orders?.filter((o) => ACTIVE.includes(o.status)).length || 0
  return (
    <section className="page container admin">
      <div className="admin-head">
        <h1 className="page-title">Administración</h1>
        {api.mode === 'demo' && <span className="demo-tag">modo demo: datos solo en este navegador</span>}
      </div>
      <nav className="tabs">
        <NavLink end to="/admin">Resumen</NavLink>
        <NavLink to="/admin/pedidos">Pedidos {pending > 0 && <span className="badge">{pending}</span>}</NavLink>
        <NavLink to="/admin/menu">Menú</NavLink>
        <NavLink to="/admin/ingredientes">Ingredientes</NavLink>
        <NavLink to="/admin/usuarios">Usuarios</NavLink>
        <NavLink to="/admin/ajustes">Ajustes</NavLink>
      </nav>
      <Routes>
        <Route index element={<Dashboard orders={orders} />} />
        <Route path="pedidos" element={<Orders orders={orders} reload={reload} />} />
        <Route path="menu" element={<Products />} />
        <Route path="ingredientes" element={<Ingredients />} />
        <Route path="usuarios" element={<Users />} />
        <Route path="ajustes" element={<Settings />} />
      </Routes>
    </section>
  )
}

/* ---------- Resumen ---------- */

function Dashboard({ orders }) {
  const stats = useMemo(() => {
    if (!orders) return null
    const valid = orders.filter((o) => o.status !== 'cancelado')
    const today = valid.filter((o) => isToday(o.createdAt))
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - (6 - i))
      const key = d.toDateString()
      const dayOrders = valid.filter((o) => new Date(o.createdAt).toDateString() === key)
      return {
        label: d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric' }),
        total: dayOrders.reduce((s, o) => s + o.total, 0),
        count: dayOrders.length,
      }
    })
    const top = {}
    valid.forEach((o) => o.items.forEach((l) => { top[l.name] = (top[l.name] || 0) + l.qty }))
    return {
      todaySales: today.reduce((s, o) => s + o.total, 0),
      todayCount: today.length,
      pending: orders.filter((o) => ACTIVE.includes(o.status)).length,
      avg: valid.length ? Math.round(valid.reduce((s, o) => s + o.total, 0) / valid.length) : 0,
      totalSales: valid.reduce((s, o) => s + o.total, 0),
      days,
      top: Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 6),
    }
  }, [orders])

  if (!stats) return <p className="muted">Cargando…</p>
  const maxDay = Math.max(1, ...stats.days.map((d) => d.total))
  const maxTop = Math.max(1, ...stats.top.map((t) => t[1]))

  return (
    <div className="dash">
      <div className="tiles">
        <div className="tile hero-tile"><span>Ventas de hoy</span><strong>{money(stats.todaySales)}</strong><small>{stats.todayCount} pedido{stats.todayCount === 1 ? '' : 's'}</small></div>
        <div className="tile"><span>Pedidos en curso</span><strong>{stats.pending}</strong><small>recibidos, en horno o en camino</small></div>
        <div className="tile"><span>Ticket promedio</span><strong>{money(stats.avg)}</strong><small>pedidos no cancelados</small></div>
        <div className="tile"><span>Ventas totales</span><strong>{money(stats.totalSales)}</strong><small>desde el lanzamiento</small></div>
      </div>
      <div className="dash-grid">
        <div className="card">
          <h3>Ventas últimos 7 días</h3>
          <div className="bars" role="table" aria-label="Ventas por día">
            {stats.days.map((d) => (
              <div key={d.label} className="bar-col" role="row" tabIndex={0}>
                <span className="bar-tip" role="cell">{money(d.total)} · {d.count} ped.</span>
                <div className="bar-track"><div className="bar" style={{ height: `${(d.total / maxDay) * 100}%` }} /></div>
                <span className="bar-label" role="cell">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3>Lo más pedido</h3>
          {stats.top.length === 0 && <p className="muted">Aún no hay pedidos.</p>}
          <ul className="hbars">
            {stats.top.map(([name, qty]) => (
              <li key={name}>
                <span className="hbar-name">{name}</span>
                <span className="hbar-track"><span className="hbar" style={{ width: `${(qty / maxTop) * 100}%` }} /></span>
                <span className="hbar-val">{qty}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

/* ---------- Pedidos ---------- */

function Orders({ orders, reload }) {
  const { api, notify } = useStore()
  const [filter, setFilter] = useState('activos')
  const [busy, setBusy] = useState(null)

  const list = useMemo(() => {
    if (!orders) return []
    if (filter === 'activos') return orders.filter((o) => ACTIVE.includes(o.status))
    if (filter === 'hoy') return orders.filter((o) => isToday(o.createdAt))
    return orders
  }, [orders, filter])

  async function setStatus(o, status) {
    if (status === 'cancelado' && !confirm(`¿Cancelar el pedido #${o.number}?`)) return
    setBusy(o.id)
    try {
      await api.setOrderStatus(o.id, status)
      await reload()
      notify(`Pedido #${o.number}: ${statusLabel(status)}`)
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setBusy(null)
    }
  }

  const nextStatus = { recibido: 'preparando', preparando: 'en_camino', en_camino: 'entregado' }

  return (
    <>
      <div className="filters">
        {[['activos', 'En curso'], ['hoy', 'Hoy'], ['todos', 'Todos']].map(([id, label]) => (
          <button key={id} className={`chip ${filter === id ? 'on' : ''}`} onClick={() => setFilter(id)}>{label}</button>
        ))}
        <button className="chip" onClick={reload}>↻ Actualizar</button>
      </div>
      {!orders && <p className="muted">Cargando…</p>}
      {orders && list.length === 0 && <p className="muted empty-admin">No hay pedidos {filter === 'activos' ? 'en curso' : 'en esta vista'}. 🍕</p>}
      <div className="order-grid">
        {list.map((o) => (
          <article key={o.id} className={`card order admin-order st-border-${o.status}`}>
            <header>
              <strong>#{o.number}</strong>
              <span className={`status-pill st-${o.status}`}>{statusLabel(o.status)}</span>
              <span className="muted">{dateTime(o.createdAt)}</span>
            </header>
            <div className="customer">
              <strong>{o.customerName}</strong>
              <a href={`tel:${o.phone}`}>📞 {o.phone}</a>
              <span>📍 {o.address}{o.reference ? ` · ${o.reference}` : ''}</span>
              <span>💳 {paymentLabel(o.paymentMethod)}</span>
              {o.notes && <span className="notes">💬 {o.notes}</span>}
            </div>
            <OrderItems order={o} />
            <div className="order-actions">
              {nextStatus[o.status] && (
                <button className="btn btn-red btn-small" disabled={busy === o.id} onClick={() => setStatus(o, nextStatus[o.status])}>
                  {ORDER_STATUSES.find((s) => s.id === nextStatus[o.status]).emoji} Pasar a “{statusLabel(nextStatus[o.status])}”
                </button>
              )}
              <select value={o.status} disabled={busy === o.id} onChange={(e) => setStatus(o, e.target.value)} aria-label="Estado">
                {ORDER_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </article>
        ))}
      </div>
    </>
  )
}

/* ---------- Menú ---------- */

const EMPTY_PRODUCT = { id: '', category: 'pizza', name: '', description: '', size: '', price: 6000, toppings: [], promo: true, available: true, sort: 50 }

function Products() {
  const { api, catalog, reloadCatalog, notify } = useStore()
  const [editing, setEditing] = useState(null)
  const ingredientById = Object.fromEntries(catalog.ingredients.map((i) => [i.id, i]))

  async function save(p) {
    try {
      await api.saveProduct(p)
      await reloadCatalog()
      setEditing(null)
      notify('Producto guardado')
    } catch (err) {
      notify(err.message, 'error')
    }
  }
  async function toggle(p) {
    await save({ ...p, available: !p.available })
  }
  async function remove(p) {
    if (!confirm(`¿Eliminar "${p.name}${p.size ? ' ' + p.size : ''}" del menú?`)) return
    try {
      await api.deleteProduct(p.id)
      await reloadCatalog()
      notify('Producto eliminado')
    } catch (err) {
      notify(err.message, 'error')
    }
  }

  const groups = [['pizza', 'Pizzas'], ['drink', 'Bebidas']]
  return (
    <>
      <div className="filters">
        <button className="btn btn-red btn-small" onClick={() => setEditing({ ...EMPTY_PRODUCT })}>+ Nueva pizza</button>
        <button className="btn btn-yellow btn-small" onClick={() => setEditing({ ...EMPTY_PRODUCT, category: 'drink', price: 1000, size: 'Lata 350 ml', promo: false })}>+ Nueva bebida</button>
      </div>
      {groups.map(([cat, title]) => (
        <div key={cat} className="card table-card">
          <h3>{title}</h3>
          <table className="table">
            <thead>
              <tr><th>Producto</th><th>Precio</th><th>Estado</th><th /></tr>
            </thead>
            <tbody>
              {catalog.products.filter((p) => p.category === cat).map((p) => (
                <tr key={p.id} className={p.available ? '' : 'off'}>
                  <td>
                    <div className="prod-cell">
                      {cat === 'pizza' && <PizzaArt size={44} toppings={(p.toppings || []).map((id) => ingredientById[id]).filter(Boolean)} />}
                      <div>
                        <strong>{p.name}</strong>{p.size && <small> · {p.size}</small>}
                        {cat === 'pizza' && p.promo && <span className="pill tiny">promo</span>}
                      </div>
                    </div>
                  </td>
                  <td>{money(p.price)}</td>
                  <td>
                    <button className={`switch ${p.available ? 'on' : ''}`} onClick={() => toggle(p)} aria-label="Disponible">
                      <span />
                    </button>
                  </td>
                  <td className="actions">
                    <button className="link-btn" onClick={() => setEditing({ ...EMPTY_PRODUCT, ...p })}>Editar</button>
                    <button className="link-btn danger" onClick={() => remove(p)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {editing && <ProductModal product={editing} ingredients={catalog.ingredients} onSave={save} onClose={() => setEditing(null)} />}
    </>
  )
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-wrap" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal card" role="dialog" aria-modal="true" aria-label={title}>
        <div className="drawer-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ProductModal({ product, ingredients, onSave, onClose }) {
  const [p, setP] = useState(product)
  const [saving, setSaving] = useState(false)
  const isPizza = p.category === 'pizza'
  const set = (k, v) => setP({ ...p, [k]: v })
  const toggleTop = (id) => set('toppings', p.toppings.includes(id) ? p.toppings.filter((x) => x !== id) : [...p.toppings, id])

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    await onSave({ ...p, price: Number(p.price) || 0, sort: Number(p.sort) || 0 })
    setSaving(false)
  }

  return (
    <Modal title={product.id ? 'Editar producto' : isPizza ? 'Nueva pizza' : 'Nueva bebida'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        {isPizza && (
          <div className="modal-art">
            <PizzaArt size={140} toppings={ingredients.filter((i) => p.toppings.includes(i.id))} animate />
          </div>
        )}
        <label>Nombre<input required value={p.name} onChange={(e) => set('name', e.target.value)} /></label>
        {isPizza ? (
          <label>Descripción<textarea rows="2" value={p.description} onChange={(e) => set('description', e.target.value)} /></label>
        ) : (
          <label>Formato<input required placeholder="Lata 350 ml / 1,5 litros" value={p.size} onChange={(e) => set('size', e.target.value)} /></label>
        )}
        <div className="row2">
          <label>Precio (CLP)<input type="number" min="0" step="100" required value={p.price} onChange={(e) => set('price', e.target.value)} /></label>
          <label>Orden<input type="number" value={p.sort} onChange={(e) => set('sort', e.target.value)} /></label>
        </div>
        {isPizza && (
          <>
            <span className="label">Ingredientes (sobre la base de pomodoro + mozzarella)</span>
            <div className="chips">
              {ingredients.map((i) => (
                <button type="button" key={i.id} className={`chip ${p.toppings.includes(i.id) ? 'on' : ''}`} onClick={() => toggleTop(i.id)}>
                  <span className="dot" style={{ background: i.color }} />{i.name}
                </button>
              ))}
            </div>
            <label className="check"><input type="checkbox" checked={p.promo} onChange={(e) => set('promo', e.target.checked)} /> Participa en la promo 2 x precio promocional</label>
          </>
        )}
        <label className="check"><input type="checkbox" checked={p.available} onChange={(e) => set('available', e.target.checked)} /> Disponible para pedir</label>
        <button className="btn btn-red btn-block" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
      </form>
    </Modal>
  )
}

/* ---------- Ingredientes ---------- */

const VISUALS = [
  ['mozzarella', 'Mozzarella'], ['tomate', 'Tomate'], ['albahaca', 'Hoja verde'], ['pepperoni', 'Pepperoni / salame'],
  ['jamon', 'Jamón / láminas'], ['cebolla', 'Aros (cebolla, pimentón)'], ['champinon', 'Champiñón'], ['generico', 'Trocitos de color'],
]

function Ingredients() {
  const { api, catalog, reloadCatalog, notify } = useStore()
  const [editing, setEditing] = useState(null)

  async function save(i) {
    try {
      await api.saveIngredient(i)
      await reloadCatalog()
      setEditing(null)
      notify('Ingrediente guardado')
    } catch (err) {
      notify(err.message, 'error')
    }
  }
  async function remove(i) {
    const used = catalog.products.filter((p) => p.toppings?.includes(i.id)).map((p) => p.name)
    if (!confirm(`¿Eliminar "${i.name}"?${used.length ? `\nLo usan: ${used.join(', ')}` : ''}`)) return
    try {
      await api.deleteIngredient(i.id)
      await reloadCatalog()
      notify('Ingrediente eliminado')
    } catch (err) {
      notify(err.message, 'error')
    }
  }

  return (
    <>
      <div className="filters">
        <button className="btn btn-red btn-small" onClick={() => setEditing({ id: '', name: '', visual: 'generico', color: '#E9C46A', available: true, sort: 50 })}>+ Nuevo ingrediente</button>
        <span className="muted small">Precio por extra en “Arma tu pizza”: {money(catalog.settings.extraPrice)} (se cambia en Ajustes)</span>
      </div>
      <div className="ing-grid">
        {catalog.ingredients.map((i) => (
          <div key={i.id} className={`card ing ${i.available ? '' : 'off'}`}>
            <PizzaArt size={70} toppings={[i]} />
            <strong>{i.name}</strong>
            <div className="ing-actions">
              <button className={`switch ${i.available ? 'on' : ''}`} onClick={() => save({ ...i, available: !i.available })} aria-label="Disponible"><span /></button>
              <button className="link-btn" onClick={() => setEditing(i)}>Editar</button>
              <button className="link-btn danger" onClick={() => remove(i)}>Eliminar</button>
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <Modal title={editing.id ? 'Editar ingrediente' : 'Nuevo ingrediente'} onClose={() => setEditing(null)}>
          <IngredientForm ingredient={editing} onSave={save} />
        </Modal>
      )}
    </>
  )
}

function IngredientForm({ ingredient, onSave }) {
  const [i, setI] = useState(ingredient)
  const set = (k, v) => setI({ ...i, [k]: v })
  return (
    <form className="form" onSubmit={(e) => { e.preventDefault(); onSave({ ...i, sort: Number(i.sort) || 0 }) }}>
      <div className="modal-art"><PizzaArt size={120} toppings={[{ ...i, id: i.id || 'nuevo' }]} /></div>
      <label>Nombre<input required value={i.name} onChange={(e) => set('name', e.target.value)} /></label>
      <div className="row2">
        <label>Dibujo<select value={i.visual} onChange={(e) => set('visual', e.target.value)}>{VISUALS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label>Color<input type="color" value={i.color} onChange={(e) => set('color', e.target.value)} /></label>
      </div>
      <label>Orden<input type="number" value={i.sort} onChange={(e) => set('sort', e.target.value)} /></label>
      <label className="check"><input type="checkbox" checked={i.available} onChange={(e) => set('available', e.target.checked)} /> Disponible</label>
      <button className="btn btn-red btn-block">Guardar</button>
    </form>
  )
}

/* ---------- Usuarios ---------- */

function Users() {
  const { api, user, notify } = useStore()
  const [users, setUsers] = useState(null)
  const [q, setQ] = useState('')
  const load = useCallback(() => api.listUsers().then(setUsers).catch((e) => notify(e.message, 'error')), [api, notify])
  useEffect(() => { load() }, [load])

  async function setRole(u, role) {
    if (!confirm(`¿${role === 'admin' ? 'Dar' : 'Quitar'} permisos de administrador a ${u.name || u.email}?`)) return
    try {
      await api.setUserRole(u.id, role)
      await load()
      notify('Rol actualizado')
    } catch (err) {
      notify(err.message, 'error')
    }
  }

  const list = (users || []).filter((u) => `${u.name} ${u.email} ${u.phone}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="card table-card">
      <div className="filters">
        <input className="search" placeholder="Buscar por nombre, correo o teléfono" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="muted small">{users?.length ?? '…'} usuarios</span>
      </div>
      <table className="table">
        <thead><tr><th>Nombre</th><th>Contacto</th><th>Dirección</th><th>Rol</th></tr></thead>
        <tbody>
          {list.map((u) => (
            <tr key={u.id}>
              <td><strong>{u.name || '—'}</strong><small className="block muted">{u.createdAt ? dateTime(u.createdAt) : ''}</small></td>
              <td>{u.email}<small className="block">{u.phone}</small></td>
              <td>{u.address}</td>
              <td>
                <span className={`role role-${u.role}`}>{u.role === 'admin' ? 'Admin' : 'Cliente'}</span>
                {u.id !== user.id && (
                  <button className="link-btn" onClick={() => setRole(u, u.role === 'admin' ? 'user' : 'admin')}>
                    {u.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ---------- Ajustes ---------- */

function Settings() {
  const { api, catalog, reloadCatalog, notify } = useStore()
  const [s, setS] = useState(catalog.settings)
  const [saving, setSaving] = useState(false)
  const num = (k) => ({ type: 'number', min: 0, step: 100, value: s[k], onChange: (e) => setS({ ...s, [k]: Number(e.target.value) }) })
  const txt = (k) => ({ value: s[k] ?? '', onChange: (e) => setS({ ...s, [k]: e.target.value }) })

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.saveSettings(s)
      await reloadCatalog()
      notify('Ajustes guardados')
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="settings" onSubmit={submit}>
      <div className="card form">
        <h3>Local</h3>
        <label className="check big">
          <button type="button" className={`switch ${s.storeOpen ? 'on' : ''}`} onClick={() => setS({ ...s, storeOpen: !s.storeOpen })}><span /></button>
          {s.storeOpen ? '🟢 Abierto: recibiendo pedidos' : '🔴 Cerrado: no se aceptan pedidos'}
        </label>
        <label>Horario<input {...txt('hours')} /></label>
        <label>WhatsApp (opcional)<input placeholder="+56 9 1234 5678" {...txt('whatsapp')} /></label>
        <label>Datos de transferencia<textarea rows="3" placeholder="Banco, tipo de cuenta, número, RUT, correo" {...txt('transferInfo')} /></label>
      </div>
      <div className="card form">
        <h3>Delivery</h3>
        <div className="row2">
          <label>Comuna<input {...txt('deliveryZone')} /></label>
          <label>Costo delivery<input {...num('deliveryFee')} /></label>
        </div>
        <label>Tamaño de pizza<input {...txt('pizzaSize')} /></label>
      </div>
      <div className="card form">
        <h3>Promo lanzamiento</h3>
        <label className="check"><input type="checkbox" checked={s.promoEnabled} onChange={(e) => setS({ ...s, promoEnabled: e.target.checked })} /> Promo activa (2 pizzas del menú por precio especial)</label>
        <label>Precio por 2 pizzas<input {...num('promoPrice')} /></label>
      </div>
      <div className="card form">
        <h3>Arma tu pizza</h3>
        <div className="row2">
          <label>Precio base<input {...num('buildBasePrice')} /></label>
          <label>Precio por extra<input {...num('extraPrice')} /></label>
        </div>
        <label>Mínimo de extras<input type="number" min="0" max="10" value={s.buildMinExtras} onChange={(e) => setS({ ...s, buildMinExtras: Number(e.target.value) })} /></label>
        <p className="muted small">Precio mínimo actual: {money(s.buildBasePrice + s.buildMinExtras * s.extraPrice)}</p>
      </div>
      <div className="settings-save">
        <button className="btn btn-red btn-big" disabled={saving}>{saving ? 'Guardando…' : 'Guardar ajustes'}</button>
      </div>
    </form>
  )
}
