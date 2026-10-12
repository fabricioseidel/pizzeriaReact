import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Al cambiar de página vuelve arriba (las anclas #menu, #arma las maneja Home).
export default function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}
