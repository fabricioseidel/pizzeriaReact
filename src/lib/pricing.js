// Cálculo de precios del carrito. La misma lógica vive en la función
// place_order de supabase/schema.sql, que recalcula el total en el servidor.

export function customPizzaPrice(extraCount, settings) {
  return settings.buildBasePrice + extraCount * settings.extraPrice
}

// Agrupa las pizzas en promo de a 2 (de mayor a menor precio) y devuelve el descuento.
export function promoDiscount(unitPrices, settings) {
  if (!settings.promoEnabled) return 0
  const sorted = [...unitPrices].sort((a, b) => b - a)
  let discount = 0
  for (let i = 0; i + 1 < sorted.length; i += 2) {
    discount += Math.max(0, sorted[i] + sorted[i + 1] - settings.promoPrice)
  }
  return discount
}

// items: [{ key, kind: 'pizza'|'drink'|'custom', productId?, extras?, qty }]
export function computeCart(items, catalog) {
  const { settings } = catalog
  const productById = Object.fromEntries(catalog.products.map((p) => [p.id, p]))
  const ingredientById = Object.fromEntries(catalog.ingredients.map((i) => [i.id, i]))
  const promoUnits = []
  const lines = []
  const problems = []

  for (const item of items) {
    const qty = Math.max(1, Math.min(20, item.qty || 1))
    if (item.kind === 'custom') {
      const extras = (item.extras || []).map((id) => ingredientById[id]).filter((i) => i && i.available)
      if (extras.length < settings.buildMinExtras) problems.push(item.key)
      const unitPrice = customPizzaPrice(extras.length, settings)
      lines.push({ ...item, qty, name: 'Arma tu pizza', extrasNames: extras.map((e) => e.name), unitPrice, lineTotal: unitPrice * qty })
    } else {
      const p = productById[item.productId]
      if (!p || !p.available) {
        problems.push(item.key)
        lines.push({ ...item, qty, name: p ? p.name : 'Producto no disponible', unitPrice: 0, lineTotal: 0, unavailable: true })
        continue
      }
      if (p.category === 'pizza' && p.promo) for (let i = 0; i < qty; i++) promoUnits.push(p.price)
      lines.push({ ...item, qty, name: p.name, size: p.size, unitPrice: p.price, lineTotal: p.price * qty })
    }
  }

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0)
  const discount = promoDiscount(promoUnits, settings)
  const deliveryFee = lines.length ? settings.deliveryFee : 0
  return {
    lines,
    problems,
    subtotal,
    discount,
    promoPairs: settings.promoEnabled ? Math.floor(promoUnits.length / 2) : 0,
    promoLeftover: settings.promoEnabled && promoUnits.length % 2 === 1,
    deliveryFee,
    total: subtotal - discount + deliveryFee,
    count: lines.reduce((s, l) => s + l.qty, 0),
  }
}
