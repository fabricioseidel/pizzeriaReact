import { useEffect } from 'react'

// Refresca datos cada `ms` mientras la pestaña esté visible.
export function usePolling(fn, ms) {
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') fn()
    }, ms)
    return () => clearInterval(id)
  }, [fn, ms])
}
