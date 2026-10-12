import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base relativa: funciona en GitHub Pages (/pizzeriaReact/) y en dominio propio
export default defineConfig({
  plugins: [react()],
  base: './',
})
