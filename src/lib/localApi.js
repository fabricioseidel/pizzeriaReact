// Modo demo: todo se guarda en localStorage de este navegador.
// Sirve para probar la página sin backend; para operar de verdad conecta Supabase.
import { DEFAULT_INGREDIENTS, DEFAULT_PRODUCTS, DEFAULT_SETTINGS } from './defaults'
import { computeCart } from './pricing'
import { uid } from './format'

const K = {
  users: 'tp_users',
  session: 'tp_session',
  products: 'tp_products',
  ingredients: 'tp_ingredients',
  settings: 'tp_settings',
  orders: 'tp_orders',
}

export const DEMO_ADMIN = { email: 'admin@tupizzita.cl', password: 'admin123' }

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}
const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* almacenamiento no disponible: la sesión seguirá en memoria */
  }
}

async function hash(password, salt) {
  const data = new TextEncoder().encode(salt + ':' + password)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const publicUser = ({ passwordHash, salt, ...u }) => u

export function createLocalApi() {
  const listeners = new Set()
  const emit = (user) => listeners.forEach((cb) => cb(user))

  async function users() {
    let list = read(K.users, null)
    if (!list) {
      const salt = uid()
      list = [{
        id: uid(), name: 'Administrador', email: DEMO_ADMIN.email, phone: '', address: '',
        role: 'admin', createdAt: new Date().toISOString(), salt, passwordHash: await hash(DEMO_ADMIN.password, salt),
      }]
      write(K.users, list)
    }
    return list
  }

  const catalog = () => ({
    products: read(K.products, DEFAULT_PRODUCTS),
    ingredients: read(K.ingredients, DEFAULT_INGREDIENTS),
    settings: { ...DEFAULT_SETTINGS, ...read(K.settings, {}) },
  })

  async function current() {
    const id = read(K.session, null)
    if (!id) return null
    const u = (await users()).find((x) => x.id === id)
    return u ? publicUser(u) : null
  }

  async function requireAdmin() {
    const u = await current()
    if (!u || u.role !== 'admin') throw new Error('Solo administradores')
    return u
  }

  const upsert = (key, fallback, item) => {
    const list = read(key, fallback)
    const i = list.findIndex((x) => x.id === item.id)
    if (i >= 0) list[i] = item
    else list.push({ ...item, id: item.id || uid() })
    write(key, list)
  }

  return {
    mode: 'demo',

    getSessionUser: current,
    onAuthChange(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },

    async login(email, password) {
      const u = (await users()).find((x) => x.email.toLowerCase() === email.trim().toLowerCase())
      if (!u || u.passwordHash !== (await hash(password, u.salt))) throw new Error('Correo o contraseña incorrectos')
      write(K.session, u.id)
      emit(publicUser(u))
      return publicUser(u)
    },

    async register({ name, email, phone, address, password }) {
      const list = await users()
      if (list.some((x) => x.email.toLowerCase() === email.trim().toLowerCase())) throw new Error('Ese correo ya está registrado')
      const salt = uid()
      const u = {
        id: uid(), name: name.trim(), email: email.trim(), phone: phone.trim(), address: address.trim(),
        role: 'user', createdAt: new Date().toISOString(), salt, passwordHash: await hash(password, salt),
      }
      write(K.users, [...list, u])
      write(K.session, u.id)
      emit(publicUser(u))
      return { user: publicUser(u) }
    },

    async logout() {
      localStorage.removeItem(K.session)
      emit(null)
    },

    async updateProfile(patch) {
      const me = await current()
      const list = await users()
      const u = list.find((x) => x.id === me.id)
      Object.assign(u, { name: patch.name, phone: patch.phone, address: patch.address })
      write(K.users, list)
      emit(publicUser(u))
      return publicUser(u)
    },

    async changePassword(password) {
      const me = await current()
      const list = await users()
      const u = list.find((x) => x.id === me.id)
      u.salt = uid()
      u.passwordHash = await hash(password, u.salt)
      write(K.users, list)
    },

    async getCatalog() {
      return catalog()
    },

    async saveProduct(p) {
      await requireAdmin()
      upsert(K.products, DEFAULT_PRODUCTS, p)
    },
    async deleteProduct(id) {
      await requireAdmin()
      write(K.products, read(K.products, DEFAULT_PRODUCTS).filter((p) => p.id !== id))
    },
    async saveIngredient(i) {
      await requireAdmin()
      upsert(K.ingredients, DEFAULT_INGREDIENTS, i)
    },
    async deleteIngredient(id) {
      await requireAdmin()
      write(K.ingredients, read(K.ingredients, DEFAULT_INGREDIENTS).filter((i) => i.id !== id))
    },
    async saveSettings(s) {
      await requireAdmin()
      write(K.settings, s)
    },

    async placeOrder({ items, customer }) {
      const me = await current()
      if (!me) throw new Error('Debes iniciar sesión para pedir')
      const cat = catalog()
      if (!cat.settings.storeOpen) throw new Error('La pizzería está cerrada en este momento')
      const cart = computeCart(items, cat)
      if (!cart.lines.length) throw new Error('Tu carrito está vacío')
      if (cart.problems.length) throw new Error('Revisa tu carrito: hay productos no disponibles o pizzas sin el mínimo de ingredientes')
      const orders = read(K.orders, [])
      const order = {
        id: uid(),
        number: orders.reduce((m, o) => Math.max(m, o.number), 1000) + 1,
        userId: me.id,
        customerName: customer.name,
        phone: customer.phone,
        address: customer.address,
        reference: customer.reference,
        paymentMethod: customer.paymentMethod,
        notes: customer.notes,
        items: cart.lines.map(({ kind, productId, name, size, extrasNames, qty, unitPrice, lineTotal }) =>
          ({ kind, productId, name, size, extras: extrasNames, qty, unitPrice, lineTotal })),
        subtotal: cart.subtotal,
        discount: cart.discount,
        deliveryFee: cart.deliveryFee,
        total: cart.total,
        status: 'recibido',
        createdAt: new Date().toISOString(),
      }
      write(K.orders, [order, ...orders])
      return order
    },

    async myOrders() {
      const me = await current()
      return me ? read(K.orders, []).filter((o) => o.userId === me.id) : []
    },
    async allOrders() {
      await requireAdmin()
      return read(K.orders, [])
    },
    async setOrderStatus(id, status) {
      await requireAdmin()
      write(K.orders, read(K.orders, []).map((o) => (o.id === id ? { ...o, status } : o)))
    },

    async listUsers() {
      await requireAdmin()
      return (await users()).map(publicUser)
    },
    async setUserRole(id, role) {
      const me = await requireAdmin()
      if (id === me.id) throw new Error('No puedes quitarte tu propio rol de administrador')
      write(K.users, (await users()).map((u) => (u.id === id ? { ...u, role } : u)))
    },
  }
}
