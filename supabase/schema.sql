-- tupizzita.cl · esquema para Supabase
-- Ejecutar completo en: Supabase > SQL Editor. Es idempotente (se puede correr de nuevo).

create extension if not exists pgcrypto;

-- ---------- Tablas ----------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  address text not null default '',
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.ingredients (
  id text primary key,
  name text not null,
  visual text not null default 'generico',
  color text not null default '#E9C46A',
  available boolean not null default true,
  sort int not null default 0
);

create table if not exists public.products (
  id text primary key,
  category text not null check (category in ('pizza', 'drink')),
  name text not null,
  description text not null default '',
  size text not null default '',
  price int not null check (price >= 0),
  toppings text[] not null default '{}',
  promo boolean not null default false,
  available boolean not null default true,
  sort int not null default 0
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity (start with 1001),
  user_id uuid references auth.users (id) on delete set null,
  customer_name text not null,
  phone text not null,
  address text not null,
  reference text not null default '',
  payment_method text not null,
  notes text not null default '',
  items jsonb not null,
  subtotal int not null,
  discount int not null default 0,
  delivery_fee int not null,
  total int not null,
  status text not null default 'recibido'
    check (status in ('recibido', 'preparando', 'en_camino', 'entregado', 'cancelado')),
  created_at timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders (user_id);
create index if not exists orders_created_idx on public.orders (created_at desc);

-- ---------- Helpers ----------

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Crea el perfil al registrarse (nombre, teléfono y dirección vienen del formulario)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, phone, address)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'address', '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Seguridad (RLS) ----------

alter table public.profiles enable row level security;
alter table public.settings enable row level security;
alter table public.ingredients enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;

drop policy if exists "perfil: ver propio o admin" on public.profiles;
create policy "perfil: ver propio o admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
drop policy if exists "perfil: editar propio" on public.profiles;
create policy "perfil: editar propio" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Un cliente no puede cambiarse el rol ni el correo del perfil desde la API
create or replace function public.protect_profile() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user in ('anon', 'authenticated') then
    new.id := old.id;
    new.email := old.email;
    new.created_at := old.created_at;
    if new.role is distinct from old.role and not public.is_admin() then
      raise exception 'No autorizado para cambiar el rol';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists protect_profile on public.profiles;
create trigger protect_profile
  before update on public.profiles
  for each row execute function public.protect_profile();

drop policy if exists "settings: lectura pública" on public.settings;
create policy "settings: lectura pública" on public.settings for select using (true);
drop policy if exists "settings: admin" on public.settings;
create policy "settings: admin" on public.settings for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "ingredients: lectura pública" on public.ingredients;
create policy "ingredients: lectura pública" on public.ingredients for select using (true);
drop policy if exists "ingredients: admin" on public.ingredients;
create policy "ingredients: admin" on public.ingredients for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "products: lectura pública" on public.products;
create policy "products: lectura pública" on public.products for select using (true);
drop policy if exists "products: admin" on public.products;
create policy "products: admin" on public.products for all using (public.is_admin()) with check (public.is_admin());

-- Sin política de insert/delete: los pedidos se crean solo con place_order(),
-- que recalcula los precios en el servidor
drop policy if exists "orders: ver propios o admin" on public.orders;
create policy "orders: ver propios o admin" on public.orders
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "orders: admin cambia estado" on public.orders;
create policy "orders: admin cambia estado" on public.orders
  for update using (public.is_admin()) with check (public.is_admin());

-- ---------- Funciones ----------

create or replace function public.set_user_role(p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo administradores'; end if;
  if p_user = auth.uid() then raise exception 'No puedes quitarte tu propio rol de administrador'; end if;
  if p_role not in ('user', 'admin') then raise exception 'Rol inválido'; end if;
  update public.profiles set role = p_role where id = p_user;
end $$;

-- Misma lógica que src/lib/pricing.js
create or replace function public.place_order(p_items jsonb, p_customer jsonb) returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  s jsonb;
  it jsonb;
  q int;
  unit int;
  prod public.products;
  extra_names text[];
  extra_count int;
  min_extras int;
  promo_units int[] := '{}';
  lines jsonb := '[]'::jsonb;
  v_subtotal int := 0;
  v_discount int := 0;
  v_fee int;
  i int;
  o public.orders;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión para pedir'; end if;
  select data into s from public.settings where id = 1;
  s := coalesce(s, '{}'::jsonb);
  if not coalesce((s ->> 'storeOpen')::boolean, true) then
    raise exception 'La pizzería está cerrada en este momento';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Tu carrito está vacío';
  end if;
  if jsonb_array_length(p_items) > 30 then raise exception 'Demasiados productos en un pedido'; end if;
  if coalesce(trim(p_customer ->> 'name'), '') = ''
     or coalesce(trim(p_customer ->> 'phone'), '') = ''
     or coalesce(trim(p_customer ->> 'address'), '') = '' then
    raise exception 'Faltan datos de entrega';
  end if;

  min_extras := coalesce((s ->> 'buildMinExtras')::int, 2);

  for it in select value from jsonb_array_elements(p_items) loop
    q := greatest(1, least(20, coalesce((it ->> 'qty')::int, 1)));
    if it ->> 'kind' = 'custom' then
      select coalesce(array_agg(name order by sort), '{}'), count(*)
        into extra_names, extra_count
        from public.ingredients
        where available
          and id in (select jsonb_array_elements_text(coalesce(it -> 'extras', '[]'::jsonb)));
      if extra_count < min_extras then
        raise exception 'Arma tu pizza requiere al menos % ingredientes extra', min_extras;
      end if;
      unit := coalesce((s ->> 'buildBasePrice')::int, 5000) + extra_count * coalesce((s ->> 'extraPrice')::int, 1000);
      lines := lines || jsonb_build_array(jsonb_build_object(
        'kind', 'custom', 'name', 'Arma tu pizza', 'extras', to_jsonb(extra_names),
        'qty', q, 'unitPrice', unit, 'lineTotal', unit * q));
    else
      select * into prod from public.products where id = it ->> 'productId' and available;
      if not found then raise exception 'Hay un producto en tu carrito que ya no está disponible'; end if;
      unit := prod.price;
      if prod.category = 'pizza' and prod.promo then
        for i in 1..q loop promo_units := promo_units || unit; end loop;
      end if;
      lines := lines || jsonb_build_array(jsonb_build_object(
        'kind', prod.category, 'productId', prod.id, 'name', prod.name, 'size', nullif(prod.size, ''),
        'qty', q, 'unitPrice', unit, 'lineTotal', unit * q));
    end if;
    v_subtotal := v_subtotal + unit * q;
  end loop;

  -- promo: pares de pizzas (de mayor a menor precio) al precio promocional
  if coalesce((s ->> 'promoEnabled')::boolean, false) and coalesce(array_length(promo_units, 1), 0) >= 2 then
    select array_agg(x order by x desc) into promo_units from unnest(promo_units) as x;
    i := 1;
    while i + 1 <= array_length(promo_units, 1) loop
      v_discount := v_discount + greatest(0, promo_units[i] + promo_units[i + 1] - coalesce((s ->> 'promoPrice')::int, 10000));
      i := i + 2;
    end loop;
  end if;

  v_fee := coalesce((s ->> 'deliveryFee')::int, 1000);

  insert into public.orders (user_id, customer_name, phone, address, reference, payment_method, notes,
                             items, subtotal, discount, delivery_fee, total)
  values (
    auth.uid(),
    left(trim(p_customer ->> 'name'), 120),
    left(trim(p_customer ->> 'phone'), 40),
    left(trim(p_customer ->> 'address'), 200),
    left(coalesce(p_customer ->> 'reference', ''), 200),
    case when p_customer ->> 'paymentMethod' in ('efectivo', 'transferencia') then p_customer ->> 'paymentMethod' else 'efectivo' end,
    left(coalesce(p_customer ->> 'notes', ''), 500),
    lines, v_subtotal, v_discount, v_fee, v_subtotal - v_discount + v_fee
  )
  returning * into o;
  return o;
end $$;

-- is_admin() queda pública: la usan las políticas de lectura del menú
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.place_order(jsonb, jsonb) from public, anon;
revoke execute on function public.set_user_role(uuid, text) from public, anon;
grant execute on function public.place_order(jsonb, jsonb) to authenticated;
grant execute on function public.set_user_role(uuid, text) to authenticated;

-- ---------- Datos iniciales ----------

insert into public.settings (id, data) values (1, '{
  "storeOpen": true,
  "hours": "Martes a domingo · 18:00 a 23:00",
  "deliveryZone": "Macul",
  "deliveryFee": 1000,
  "pizzaSize": "29 cm",
  "promoEnabled": true,
  "promoPrice": 10000,
  "buildBasePrice": 5000,
  "buildMinExtras": 2,
  "extraPrice": 1000,
  "whatsapp": "",
  "transferInfo": ""
}'::jsonb) on conflict (id) do nothing;

insert into public.ingredients (id, name, visual, color, sort) values
  ('mozzarella', 'Mozzarella extra', 'mozzarella', '#FFF8E1', 1),
  ('tomate', 'Tomate', 'tomate', '#E63946', 2),
  ('albahaca', 'Albahaca', 'albahaca', '#2D6A4F', 3),
  ('pepperoni', 'Pepperoni', 'pepperoni', '#B5172B', 4),
  ('jamon', 'Jamón', 'jamon', '#F4A6A6', 5),
  ('cebolla', 'Cebolla', 'cebolla', '#C77DFF', 6),
  ('champinones', 'Champiñones', 'champinon', '#D9C2A7', 7)
on conflict (id) do nothing;

insert into public.products (id, category, name, description, size, price, toppings, promo, sort) values
  ('pz-mozzarella', 'pizza', 'Mozzarella', 'La clásica: doble mozzarella fundida sobre nuestra pomodoro casera.', '', 6000, '{mozzarella}', true, 1),
  ('pz-margarita', 'pizza', 'Margarita', 'Tomate fresco, albahaca y mozzarella. Simple y perfecta.', '', 6000, '{tomate,albahaca}', true, 2),
  ('pz-pepperoni', 'pizza', 'Pepperoni', 'Generosas rodajas de pepperoni que se doran en el horno.', '', 6000, '{pepperoni}', true, 3),
  ('pz-jamon', 'pizza', 'Jamón', 'Jamón de primera sobre mozzarella derretida.', '', 6000, '{jamon}', true, 4),
  ('pz-cebolla', 'pizza', 'Cebolla', 'Cebolla en pluma que se carameliza al hornear.', '', 6000, '{cebolla}', true, 5),
  ('pz-champinones', 'pizza', 'Champiñones', 'Champiñones laminados, jugosos y llenos de sabor.', '', 6000, '{champinones}', true, 6),
  ('bb-coca-lata', 'drink', 'Coca-Cola', '', 'Lata 350 ml', 1000, '{}', false, 10),
  ('bb-cocazero-lata', 'drink', 'Coca-Cola Zero', '', 'Lata 350 ml', 1000, '{}', false, 11),
  ('bb-fanta-lata', 'drink', 'Fanta', '', 'Lata 350 ml', 1000, '{}', false, 12),
  ('bb-sprite-lata', 'drink', 'Sprite', '', 'Lata 350 ml', 1000, '{}', false, 13),
  ('bb-coca-15', 'drink', 'Coca-Cola', '', '1,5 litros', 2500, '{}', false, 20),
  ('bb-cocazero-15', 'drink', 'Coca-Cola Zero', '', '1,5 litros', 2500, '{}', false, 21),
  ('bb-fanta-15', 'drink', 'Fanta', '', '1,5 litros', 2500, '{}', false, 22),
  ('bb-sprite-15', 'drink', 'Sprite', '', '1,5 litros', 2500, '{}', false, 23)
on conflict (id) do nothing;

-- ---------- Primer administrador ----------
-- 1) Regístrate en la página con tu correo.
-- 2) Ejecuta (cambiando el correo):
--    update public.profiles set role = 'admin' where email = 'tu-correo@ejemplo.cl';
