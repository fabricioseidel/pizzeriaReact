import { Navigate, Route, Routes } from 'react-router-dom'
import { useStore } from './context/StoreContext'
import { CartDrawer, Footer, Navbar, RequireAuth, Toast } from './components/Layout'
import PizzaArt from './components/PizzaArt'
import ScrollToTop from './components/ScrollToTop'
import Home from './pages/Home'
import { Login, Register } from './pages/Auth'
import Checkout from './pages/Checkout'
import Account from './pages/Account'
import Admin from './pages/admin/Admin'

export default function App() {
  const { catalog, loadError } = useStore()

  if (!catalog) {
    return (
      <div className="splash">
        <PizzaArt toppings={[{ id: 'pepperoni', visual: 'pepperoni' }]} size={140} className="spin-fast" />
        <p>{loadError || 'Calentando el horno…'}</p>
      </div>
    )
  }

  return (
    <>
      <ScrollToTop />
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Register />} />
          <Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
          <Route path="/mi-cuenta" element={<RequireAuth><Account /></RequireAuth>} />
          <Route path="/admin/*" element={<RequireAuth admin><Admin /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
      <CartDrawer />
      <Toast />
    </>
  )
}
