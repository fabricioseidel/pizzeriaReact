import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../context/StoreContext'
import { DEMO_ADMIN } from '../lib/localApi'
import PizzaArt from '../components/PizzaArt'

const ART = [
  { id: 'tomate', visual: 'tomate' },
  { id: 'albahaca', visual: 'albahaca' },
]

function AuthShell({ title, subtitle, children }) {
  return (
    <section className="auth">
      <div className="auth-card">
        <div className="auth-art">
          <PizzaArt toppings={ART} size={110} />
        </div>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
        {children}
      </div>
    </section>
  )
}

const safeNext = (next) => (next && next.startsWith('/') && !next.startsWith('//') ? next : '/')

export function Login() {
  const { api, user, setUser, notify } = useStore()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const next = safeNext(params.get('next'))
  const target = (u) => (u.role === 'admin' && next === '/' ? '/admin' : next)

  if (user) return <Navigate to={target(user)} replace />

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const u = await api.login(form.email, form.password)
      setUser(u)
      notify(`¡Hola ${u.name.split(' ')[0] || ''}! 👋`)
      navigate(target(u), { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Ingresar" subtitle="Entra para hacer tu pedido y seguirlo en vivo.">
      <form onSubmit={submit} className="form">
        <label>Correo<input type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>Contraseña<input type="password" required autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-red btn-block" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</button>
      </form>
      <p className="auth-alt">¿No tienes cuenta? <Link to={`/registro${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}>Regístrate</Link></p>
      {api.mode === 'demo' && (
        <p className="demo-note">
          Modo demo · administrador: <code>{DEMO_ADMIN.email}</code> / <code>{DEMO_ADMIN.password}</code>
        </p>
      )}
    </AuthShell>
  )
}

export function Register() {
  const { api, user, setUser, notify, catalog } = useStore()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', password: '', password2: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState(false)
  const next = safeNext(params.get('next'))
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  if (user) return <Navigate to={next} replace />

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (form.password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres')
    if (form.password !== form.password2) return setError('Las contraseñas no coinciden')
    setBusy(true)
    try {
      const res = await api.register(form)
      if (res.needsConfirmation) return setPending(true)
      setUser(res.user)
      notify('¡Cuenta creada! Bienvenido a tupizzita 🍕')
      navigate(next, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (pending) {
    return (
      <AuthShell title="Revisa tu correo" subtitle={`Te enviamos un enlace a ${form.email} para activar tu cuenta.`}>
        <Link to="/login" className="btn btn-red btn-block">Ir a ingresar</Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Crear cuenta" subtitle={`Regístrate para pedir. Delivery solo en ${catalog.settings.deliveryZone}.`}>
      <form onSubmit={submit} className="form">
        <label>Nombre y apellido<input required autoComplete="name" value={form.name} onChange={set('name')} /></label>
        <label>Correo<input type="email" required autoComplete="email" value={form.email} onChange={set('email')} /></label>
        <label>Teléfono<input type="tel" required autoComplete="tel" placeholder="+56 9 1234 5678" value={form.phone} onChange={set('phone')} /></label>
        <label>Dirección en {catalog.settings.deliveryZone}<input required autoComplete="street-address" placeholder="Calle, número, depto" value={form.address} onChange={set('address')} /></label>
        <div className="row2">
          <label>Contraseña<input type="password" required autoComplete="new-password" value={form.password} onChange={set('password')} /></label>
          <label>Repetir<input type="password" required autoComplete="new-password" value={form.password2} onChange={set('password2')} /></label>
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-red btn-block" disabled={busy}>{busy ? 'Creando…' : 'Crear cuenta'}</button>
      </form>
      <p className="auth-alt">¿Ya tienes cuenta? <Link to="/login">Ingresa</Link></p>
    </AuthShell>
  )
}
