import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useStore } from '../context/StoreContext'
import { money } from '../lib/format'
import { customPizzaPrice } from '../lib/pricing'
import PizzaArt from '../components/PizzaArt'
import DrinkIcon from '../components/DrinkIcon'

const HERO_TOPPINGS = [
  { id: 'pepperoni', visual: 'pepperoni' },
  { id: 'champinones', visual: 'champinon' },
  { id: 'albahaca', visual: 'albahaca' },
]

export default function Home() {
  const { catalog } = useStore()
  const location = useLocation()
  const s = catalog.settings

  useEffect(() => {
    if (!location.hash) return
    const el = document.getElementById(location.hash.slice(1))
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }, [location.hash, location.key])

  const ingredientById = useMemo(() => Object.fromEntries(catalog.ingredients.map((i) => [i.id, i])), [catalog.ingredients])
  const pizzas = catalog.products.filter((p) => p.category === 'pizza')
  const drinks = catalog.products.filter((p) => p.category === 'drink')
  const toppingsOf = (p) => (p.toppings || []).map((id) => ingredientById[id]).filter(Boolean)

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-text">
            <span className="kicker">🍕 Pizzería artesanal casera</span>
            <h1>Pizza de <em>masa madre</em> directo a tu puerta</h1>
            <p className="lead">
              Salsa pomodoro casera, mozzarella de verdad y masa fermentada lento.
              Pizzas de {s.pizzaSize} hechas a mano, solo delivery en <strong>{s.deliveryZone}</strong>.
            </p>
            <div className="hero-cta">
              <Link to="/#menu" className="btn btn-yellow btn-big">Pedir ahora</Link>
              <Link to="/#arma" className="btn btn-ghost btn-big">Arma tu pizza</Link>
            </div>
            {!s.storeOpen && <p className="closed-banner">Ahora estamos cerrados · {s.hours}</p>}
          </div>
          <div className="hero-art">
            <PizzaArt toppings={HERO_TOPPINGS} size={420} className="spin" title="Pizza de tupizzita.cl" />
            {s.promoEnabled && (
              <div className="starburst">
                <span>PROMO<br />LANZAMIENTO</span>
                <strong>2 x {money(s.promoPrice)}</strong>
              </div>
            )}
          </div>
        </div>
      </section>

      {s.promoEnabled && (
        <div className="marquee-wrap"><div className="marquee" aria-label="Promoción">
          <div className="marquee-track">
            {Array.from({ length: 2 }).map((_, k) => (
              <span key={k}>
                🔥 PROMO LANZAMIENTO · 2 PIZZAS POR {money(s.promoPrice)} · 🛵 DELIVERY EN {s.deliveryZone.toUpperCase()} {money(s.deliveryFee)} · 🍕 MASA MADRE ARTESANAL ·
                🔥 PROMO LANZAMIENTO · 2 PIZZAS POR {money(s.promoPrice)} · 🛵 DELIVERY EN {s.deliveryZone.toUpperCase()} {money(s.deliveryFee)} · 🍕 MASA MADRE ARTESANAL ·&nbsp;
              </span>
            ))}
          </div>
        </div></div>
      )}

      <section className="base">
        <div className="container">
          <h2 className="section-title">Todas nuestras pizzas llevan</h2>
          <div className="base-grid">
            <div className="base-card"><span className="base-emoji">🍅</span><h3>Salsa pomodoro casera</h3><p>Tomates cocinados lento con ajo, aceite de oliva y orégano.</p></div>
            <div className="base-card"><span className="base-emoji">🧀</span><h3>Queso mozzarella</h3><p>Generosa, cremosa y bien derretida, como debe ser.</p></div>
            <div className="base-card"><span className="base-emoji">🌾</span><h3>Masa madre artesanal</h3><p>Fermentación lenta para una masa liviana, crujiente y aireada.</p></div>
            <div className="base-card"><span className="base-emoji">📏</span><h3>{s.pizzaSize} de pizza</h3><p>Tamaño ideal para 1–2 personas. ¡O para ti solo, no juzgamos!</p></div>
          </div>
        </div>
      </section>

      <section id="menu" className="menu">
        <div className="container">
          <span className="handwritten">nuestras clásicas</span>
          <h2 className="section-title">El Menú</h2>
          <p className="section-sub">
            Cada pizza a <strong>{money(pizzas[0]?.price ?? 6000)}</strong>
            {s.promoEnabled && <> · <span className="pill">Promo: 2 por {money(s.promoPrice)}</span> (se pueden combinar)</>}
          </p>
          <div className="pizza-grid">
            {pizzas.map((p) => (
              <PizzaCard key={p.id} product={p} toppings={toppingsOf(p)} settings={s} />
            ))}
          </div>
        </div>
      </section>

      <Builder />

      <section id="bebidas" className="drinks">
        <div className="container">
          <span className="handwritten">pa' acompañar</span>
          <h2 className="section-title">Bebidas</h2>
          <DrinkGroups drinks={drinks} />
        </div>
      </section>

      <section className="delivery">
        <div className="container delivery-inner">
          <div className="delivery-map" aria-hidden>
            <span className="pin">📍</span>
            <span className="scooter">🛵</span>
          </div>
          <div>
            <span className="handwritten light">solo delivery</span>
            <h2>Llevamos tu pizza en {s.deliveryZone}</h2>
            <p>No tenemos local: horneamos al momento y la llevamos calentita a tu casa. Despacho a toda la comuna de {s.deliveryZone} por solo <strong>{money(s.deliveryFee)}</strong>.</p>
            <ol className="steps">
              <li><b>1</b> Crea tu cuenta o ingresa</li>
              <li><b>2</b> Elige tus pizzas y bebidas</li>
              <li><b>3</b> Confirma tu dirección y medio de pago</li>
              <li><b>4</b> Sigue tu pedido en vivo desde “Mis pedidos”</li>
            </ol>
            <p className="hours">🕕 {s.hours}</p>
            <Link to="/registro" className="btn btn-yellow">Crear mi cuenta</Link>
          </div>
        </div>
      </section>
    </>
  )
}

function PizzaCard({ product, toppings, settings }) {
  const { addToCart, notify } = useStore()
  const add = () => {
    addToCart({ kind: 'pizza', productId: product.id })
    notify(`${product.name} agregada 🍕`)
  }
  return (
    <article className={`pizza-card ${product.available ? '' : 'soldout'}`}>
      <div className="pizza-card-art">
        <PizzaArt toppings={toppings} size={190} title={product.name} />
        {product.promo && settings.promoEnabled && <span className="tag">2x{Math.round(settings.promoPrice / 1000)}mil</span>}
      </div>
      <h3>{product.name}</h3>
      <p>{product.description}</p>
      <div className="card-foot">
        <span className="price">{money(product.price)}</span>
        <button className="btn btn-red" onClick={add} disabled={!product.available || !settings.storeOpen}>
          {product.available ? 'Agregar' : 'Agotada'}
        </button>
      </div>
    </article>
  )
}

function DrinkGroups({ drinks }) {
  const { addToCart, notify, catalog } = useStore()
  const groups = drinks.reduce((acc, d) => {
    ;(acc[d.size] ||= []).push(d)
    return acc
  }, {})
  return (
    <div className="drink-groups">
      {Object.entries(groups).map(([size, list]) => (
        <div key={size} className="drink-group">
          <h3>{size} <span className="price">{money(list[0].price)}</span></h3>
          <div className="drink-list">
            {list.map((d) => (
              <button
                key={d.id}
                className="drink"
                disabled={!d.available || !catalog.settings.storeOpen}
                onClick={() => {
                  addToCart({ kind: 'drink', productId: d.id })
                  notify(`${d.name} ${d.size} agregada 🥤`)
                }}
              >
                <DrinkIcon name={d.name} big={/1[,.]5|litro/i.test(d.size)} />
                <span>{d.name}</span>
                <small>{d.available ? (d.price !== list[0].price ? money(d.price) : '+ Agregar') : 'Agotada'}</small>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function Builder() {
  const { catalog, addToCart, notify } = useStore()
  const s = catalog.settings
  const available = catalog.ingredients.filter((i) => i.available)
  const [picked, setPicked] = useState([])
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const chosen = available.filter((i) => picked.includes(i.id))
  const missing = Math.max(0, s.buildMinExtras - chosen.length)

  function add() {
    addToCart({ kind: 'custom', extras: chosen.map((c) => c.id) })
    notify('Tu pizza personalizada fue agregada 🎨')
    setPicked([])
  }

  return (
    <section id="arma" className="builder">
      <div className="container builder-inner">
        <div className="builder-art">
          <PizzaArt toppings={chosen} size={360} animate title="Tu pizza" />
          <div className="builder-price">
            {missing > 0 && <small>desde</small>}
            {money(customPizzaPrice(Math.max(chosen.length, s.buildMinExtras), s))}
          </div>
        </div>
        <div className="builder-panel">
          <span className="handwritten">a tu manera</span>
          <h2 className="section-title left">Arma tu pizza</h2>
          <p>
            Base {money(s.buildBasePrice)} (pomodoro + mozzarella + masa madre) y elige <strong>mínimo {s.buildMinExtras} ingredientes</strong> a {money(s.extraPrice)} cada uno.
          </p>
          <div className="chips">
            {available.map((i) => (
              <button key={i.id} className={`chip ${picked.includes(i.id) ? 'on' : ''}`} onClick={() => toggle(i.id)} aria-pressed={picked.includes(i.id)}>
                <span className="dot" style={{ background: i.color }} />
                {i.name}
                <small>+{money(s.extraPrice)}</small>
              </button>
            ))}
          </div>
          <div className="builder-summary">
            <div>
              <span>Base</span><span>{money(s.buildBasePrice)}</span>
            </div>
            <div>
              <span>{chosen.length} extra{chosen.length === 1 ? '' : 's'}</span><span>{money(chosen.length * s.extraPrice)}</span>
            </div>
            <div className="grand">
              <span>Total</span><span>{money(customPizzaPrice(chosen.length, s))}</span>
            </div>
          </div>
          <button className="btn btn-red btn-big btn-block" disabled={missing > 0 || !s.storeOpen} onClick={add}>
            {missing > 0 ? `Elige ${missing} ingrediente${missing === 1 ? '' : 's'} más` : 'Agregar mi pizza'}
          </button>
          {s.promoEnabled && <p className="fineprint">* La promo 2 x {money(s.promoPrice)} aplica a las pizzas del menú.</p>}
        </div>
      </div>
    </section>
  )
}
