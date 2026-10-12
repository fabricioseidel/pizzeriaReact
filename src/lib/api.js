import { createLocalApi } from './localApi'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// Supabase se carga solo si está configurado, así el modo demo no lo descarga.
export const apiPromise =
  url && key
    ? import('./supabaseApi').then((m) => m.createSupabaseApi(url, key))
    : Promise.resolve(createLocalApi())
