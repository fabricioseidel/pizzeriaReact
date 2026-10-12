import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { StoreProvider } from './context/StoreContext'
import App from './App'
import './index.css'

// HashRouter: GitHub Pages no tiene reescritura de rutas, así las URLs nunca dan 404.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <StoreProvider>
        <App />
      </StoreProvider>
    </HashRouter>
  </StrictMode>,
)
