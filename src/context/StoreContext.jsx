import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { apiPromise } from '../lib/api'
import { computeCart } from '../lib/pricing'
import { uid } from '../lib/format'

const StoreContext = createContext(null)
export const useStore = () => useContext(StoreContext)

const CART_KEY = 'tp_cart'
const loadCart = () => {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || []
  } catch {
    return []
  }
}

export function StoreProvider({ children }) {
  const [api, setApi] = useState(null)
  const [user, setUser] = useState(null)
  const [catalog, setCatalog] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [cartItems, setCartItems] = useState(loadCart)
  const [cartOpen, setCartOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef()

  useEffect(() => {
    let unsub
    apiPromise
      .then(async (a) => {
        const [u, c] = await Promise.all([a.getSessionUser(), a.getCatalog()])
        setApi(a)
        setUser(u)
        setCatalog(c)
        unsub = a.onAuthChange(setUser)
      })
      .catch((e) => setLoadError(e.message || 'No se pudo cargar la pizzería'))
    return () => unsub?.()
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cartItems))
    } catch {
      /* sin almacenamiento: el carrito vive solo en esta pestaña */
    }
  }, [cartItems])

  const notify = useCallback((message, type = 'ok') => {
    clearTimeout(toastTimer.current)
    setToast({ message, type, id: Date.now() })
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }, [])

  const reloadCatalog = useCallback(async () => setCatalog(await api.getCatalog()), [api])

  const addToCart = useCallback((item) => {
    setCartItems((items) => {
      // pizzas y bebidas iguales se suman; cada "arma tu pizza" es su propia línea
      const same = item.kind !== 'custom' && items.find((i) => i.kind === item.kind && i.productId === item.productId)
      if (same) return items.map((i) => (i === same ? { ...i, qty: Math.min(20, i.qty + (item.qty || 1)) } : i))
      return [...items, { ...item, key: uid(), qty: item.qty || 1 }]
    })
  }, [])

  const setQty = useCallback((key, qty) => {
    setCartItems((items) => (qty <= 0 ? items.filter((i) => i.key !== key) : items.map((i) => (i.key === key ? { ...i, qty: Math.min(20, qty) } : i))))
  }, [])

  const clearCart = useCallback(() => setCartItems([]), [])

  const cart = useMemo(() => (catalog ? computeCart(cartItems, catalog) : null), [cartItems, catalog])

  const value = {
    api, user, setUser, catalog, reloadCatalog, loadError,
    cartItems, cart, addToCart, setQty, clearCart, cartOpen, setCartOpen,
    toast, notify,
    isAdmin: user?.role === 'admin',
  }
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
