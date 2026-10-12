// Modo producción: usuarios, menú y pedidos en Supabase (ver supabase/schema.sql).
import { createClient } from '@supabase/supabase-js'
import { DEFAULT_SETTINGS } from './defaults'
import { uid } from './format'

const AUTH_ERRORS = {
  'Invalid login credentials': 'Correo o contraseña incorrectos',
  'User already registered': 'Ese correo ya está registrado',
  'Email not confirmed': 'Debes confirmar tu correo antes de ingresar (revisa tu bandeja de entrada)',
  'Password should be at least 6 characters.': 'La contraseña debe tener al menos 6 caracteres',
}

function fail(error) {
  if (!error) return
  const msg = error.message || String(error)
  throw new Error(AUTH_ERRORS[msg] || msg)
}

const toProfile = (r) =>
  r && { id: r.id, name: r.name, email: r.email, phone: r.phone, address: r.address, role: r.role, createdAt: r.created_at }

const toOrder = (r) => ({
  id: r.id,
  number: r.number,
  userId: r.user_id,
  customerName: r.customer_name,
  phone: r.phone,
  address: r.address,
  reference: r.reference,
  paymentMethod: r.payment_method,
  notes: r.notes,
  items: r.items,
  subtotal: r.subtotal,
  discount: r.discount,
  deliveryFee: r.delivery_fee,
  total: r.total,
  status: r.status,
  createdAt: r.created_at,
})

export function createSupabaseApi(url, key) {
  const sb = createClient(url, key)

  async function profile(id) {
    const { data, error } = await sb.from('profiles').select('*').eq('id', id).maybeSingle()
    fail(error)
    return toProfile(data)
  }

  async function myId() {
    const { data } = await sb.auth.getSession()
    return data.session?.user?.id || null
  }

  return {
    mode: 'supabase',

    async getSessionUser() {
      const id = await myId()
      return id ? profile(id) : null
    },

    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((_event, session) => {
        // fuera del callback para no bloquear el cliente de auth
        setTimeout(async () => cb(session ? await profile(session.user.id).catch(() => null) : null), 0)
      })
      return () => data.subscription.unsubscribe()
    },

    async login(email, password) {
      const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password })
      fail(error)
      return profile(data.user.id)
    },

    async register({ name, email, phone, address, password }) {
      const { data, error } = await sb.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { name: name.trim(), phone: phone.trim(), address: address.trim() },
          emailRedirectTo: window.location.href.split('#')[0],
        },
      })
      fail(error)
      if (!data.session) return { user: null, needsConfirmation: true }
      return { user: await profile(data.user.id) }
    },

    async logout() {
      await sb.auth.signOut()
    },

    async updateProfile(patch) {
      const id = await myId()
      const { error } = await sb.from('profiles')
        .update({ name: patch.name, phone: patch.phone, address: patch.address }).eq('id', id)
      fail(error)
      return profile(id)
    },

    async changePassword(password) {
      fail((await sb.auth.updateUser({ password })).error)
    },

    async getCatalog() {
      const [p, i, s] = await Promise.all([
        sb.from('products').select('*').order('sort'),
        sb.from('ingredients').select('*').order('sort'),
        sb.from('settings').select('data').eq('id', 1).maybeSingle(),
      ])
      fail(p.error || i.error || s.error)
      return { products: p.data, ingredients: i.data, settings: { ...DEFAULT_SETTINGS, ...(s.data?.data || {}) } }
    },

    async saveProduct(prod) {
      const row = {
        id: prod.id || uid(), category: prod.category, name: prod.name, description: prod.description || '',
        size: prod.size || '', price: prod.price, toppings: prod.toppings || [], promo: !!prod.promo,
        available: !!prod.available, sort: prod.sort || 0,
      }
      fail((await sb.from('products').upsert(row)).error)
    },
    async deleteProduct(id) {
      fail((await sb.from('products').delete().eq('id', id)).error)
    },
    async saveIngredient(ing) {
      fail((await sb.from('ingredients').upsert({ ...ing, id: ing.id || uid() })).error)
    },
    async deleteIngredient(id) {
      fail((await sb.from('ingredients').delete().eq('id', id)).error)
    },
    async saveSettings(settings) {
      fail((await sb.from('settings').upsert({ id: 1, data: settings })).error)
    },

    async placeOrder({ items, customer }) {
      const { data, error } = await sb.rpc('place_order', {
        p_items: items.map(({ kind, productId, extras, qty }) => ({ kind, productId, extras, qty })),
        p_customer: customer,
      })
      fail(error)
      return toOrder(data)
    },

    async myOrders() {
      const id = await myId()
      if (!id) return []
      const { data, error } = await sb.from('orders').select('*').eq('user_id', id)
        .order('created_at', { ascending: false }).limit(50)
      fail(error)
      return data.map(toOrder)
    },
    async allOrders() {
      const { data, error } = await sb.from('orders').select('*').order('created_at', { ascending: false }).limit(500)
      fail(error)
      return data.map(toOrder)
    },
    async setOrderStatus(id, status) {
      fail((await sb.from('orders').update({ status }).eq('id', id)).error)
    },

    async listUsers() {
      const { data, error } = await sb.from('profiles').select('*').order('created_at', { ascending: false })
      fail(error)
      return data.map(toProfile)
    },
    async setUserRole(id, role) {
      fail((await sb.rpc('set_user_role', { p_user: id, p_role: role })).error)
    },
  }
}
