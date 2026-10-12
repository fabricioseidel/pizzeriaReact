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

## Datos (Supabase)

La página está conectada al proyecto Supabase **tupizzita** (`.env.production`): usuarios, menú,
ajustes y pedidos se comparten entre todos los dispositivos, y los pedidos de los clientes llegan
al panel de administración (se refresca cada 15 s).

- Esquema, políticas de seguridad (RLS) y datos iniciales: `supabase/schema.sql`.
- Los precios del pedido se recalculan en el servidor (`place_order`): nadie puede cambiar el total desde el navegador.
- Un cliente no puede darse rol de admin; los roles se cambian en *Administración → Usuarios*.
- Para registros sin correo de confirmación: Supabase → *Authentication → Sign In / Providers → Email* → desactivar **Confirm email**.
- Para hacer admin a otra cuenta desde SQL: `update public.profiles set role = 'admin' where email = 'correo@ejemplo.cl';`

Sin `.env.production` (o con `npm run build -- --mode demo`) la página funciona en **modo demo**:
los datos quedan en el navegador y el admin es `admin@tupizzita.cl` / `admin123`.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera dist/
```

React + Vite, `HashRouter` (compatible con GitHub Pages). El workflow `.github/workflows/deploy.yml`
publica la página en cada push a la rama principal (sirve con *Settings → Pages → Source* =
“GitHub Actions” o “Deploy from a branch → `gh-pages`”) y luego la prueba en vivo con
`scripts/smoke.mjs` (solo lectura).
Para usar el dominio propio tupizzita.cl: *Settings → Pages → Custom domain*.
