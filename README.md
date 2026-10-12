# 🍕 tupizzita.cl

Página web de **tupizzita.cl**, pizzería artesanal casera de masa madre. Solo delivery en Macul.

**Sitio:** https://fabricioseidel.github.io/pizzeriaReact/

## Qué incluye

- **Menú**: Mozzarella, Margarita, Pepperoni, Jamón, Cebolla y Champiñones — pizzas de 29 cm a $6.000.
  Todas con salsa pomodoro casera, mozzarella y masa madre artesanal.
- **Promo lanzamiento**: 2 pizzas del menú por $10.000 (se pueden combinar, se aplica sola en el carrito).
- **Arma tu pizza**: base $5.000 + mínimo 2 ingredientes a $1.000 c/u, con vista previa de la pizza.
- **Bebidas**: lata $1.000 · 1,5 litros $2.500.
- **Delivery** solo en Macul: $1.000.
- **Cuentas**: registro e ingreso de clientes, seguimiento del pedido en vivo (“Mis pedidos”).
- **Administración** (rol admin): resumen de ventas, pedidos con cambio de estado
  (recibido → en el horno → en camino → entregado), menú y precios, ingredientes,
  usuarios/roles y ajustes (abrir/cerrar local, horario, delivery, promo, datos de transferencia).

## Modos de datos

| Modo | Cuándo | Dónde se guardan los datos |
|---|---|---|
| **Demo** | sin variables de Supabase | en el navegador de cada visitante (solo para probar) |
| **Supabase** | con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` | base de datos compartida: los pedidos de clientes llegan al panel admin |

En modo demo el administrador es `admin@tupizzita.cl` / `admin123`.

### Conectar Supabase (para operar de verdad)

1. Crea un proyecto en [supabase.com](https://supabase.com) y ejecuta `supabase/schema.sql` en el SQL Editor.
2. En *Authentication → Sign In / Providers → Email* desactiva **Confirm email**
   (o configura *URL Configuration → Site URL* con la URL del sitio).
3. En GitHub: *Settings → Secrets and variables → Actions → Variables* crea
   `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (Project Settings → API).
4. Haz push: el workflow vuelve a publicar la página.
5. Regístrate en la página y hazte admin en el SQL Editor:
   `update public.profiles set role = 'admin' where email = 'tu-correo@ejemplo.cl';`

Los precios del pedido se recalculan en el servidor (`place_order`), así nadie puede cambiar el total desde el navegador.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera dist/
```

React + Vite, `HashRouter` (compatible con GitHub Pages). El workflow `.github/workflows/deploy.yml`
publica `dist/` en la rama `gh-pages` en cada push a la rama principal.
Para usar el dominio propio tupizzita.cl: *Settings → Pages → Custom domain*.
