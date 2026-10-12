// Datos iniciales del local. En modo Supabase vienen de la base de datos
// (ver supabase/schema.sql); en modo demo se guardan en el navegador.

export const DEFAULT_SETTINGS = {
  storeOpen: true,
  hours: 'Martes a domingo · 18:00 a 23:00',
  deliveryZone: 'Macul',
  deliveryFee: 1000,
  pizzaSize: '29 cm',
  promoEnabled: true,
  promoPrice: 10000,
  buildBasePrice: 5000,
  buildMinExtras: 2,
  extraPrice: 1000,
  whatsapp: '',
  transferInfo: '',
}

// visual: cómo se dibuja el ingrediente en la pizza (ver PizzaArt.jsx)
export const DEFAULT_INGREDIENTS = [
  { id: 'mozzarella', name: 'Mozzarella extra', visual: 'mozzarella', color: '#FFF8E1', available: true, sort: 1 },
  { id: 'tomate', name: 'Tomate', visual: 'tomate', color: '#E63946', available: true, sort: 2 },
  { id: 'albahaca', name: 'Albahaca', visual: 'albahaca', color: '#2D6A4F', available: true, sort: 3 },
  { id: 'pepperoni', name: 'Pepperoni', visual: 'pepperoni', color: '#B5172B', available: true, sort: 4 },
  { id: 'jamon', name: 'Jamón', visual: 'jamon', color: '#F4A6A6', available: true, sort: 5 },
  { id: 'cebolla', name: 'Cebolla', visual: 'cebolla', color: '#C77DFF', available: true, sort: 6 },
  { id: 'champinones', name: 'Champiñones', visual: 'champinon', color: '#D9C2A7', available: true, sort: 7 },
]

export const DEFAULT_PRODUCTS = [
  { id: 'pz-mozzarella', category: 'pizza', name: 'Mozzarella', description: 'La clásica: doble mozzarella fundida sobre nuestra pomodoro casera.', price: 6000, toppings: ['mozzarella'], promo: true, available: true, sort: 1 },
  { id: 'pz-margarita', category: 'pizza', name: 'Margarita', description: 'Tomate fresco, albahaca y mozzarella. Simple y perfecta.', price: 6000, toppings: ['tomate', 'albahaca'], promo: true, available: true, sort: 2 },
  { id: 'pz-pepperoni', category: 'pizza', name: 'Pepperoni', description: 'Generosas rodajas de pepperoni que se doran en el horno.', price: 6000, toppings: ['pepperoni'], promo: true, available: true, sort: 3 },
  { id: 'pz-jamon', category: 'pizza', name: 'Jamón', description: 'Jamón de primera sobre mozzarella derretida.', price: 6000, toppings: ['jamon'], promo: true, available: true, sort: 4 },
  { id: 'pz-cebolla', category: 'pizza', name: 'Cebolla', description: 'Cebolla en pluma que se carameliza al hornear.', price: 6000, toppings: ['cebolla'], promo: true, available: true, sort: 5 },
  { id: 'pz-champinones', category: 'pizza', name: 'Champiñones', description: 'Champiñones laminados, jugosos y llenos de sabor.', price: 6000, toppings: ['champinones'], promo: true, available: true, sort: 6 },
  { id: 'bb-coca-lata', category: 'drink', name: 'Coca-Cola', size: 'Lata 350 ml', price: 1000, available: true, sort: 10 },
  { id: 'bb-cocazero-lata', category: 'drink', name: 'Coca-Cola Zero', size: 'Lata 350 ml', price: 1000, available: true, sort: 11 },
  { id: 'bb-fanta-lata', category: 'drink', name: 'Fanta', size: 'Lata 350 ml', price: 1000, available: true, sort: 12 },
  { id: 'bb-sprite-lata', category: 'drink', name: 'Sprite', size: 'Lata 350 ml', price: 1000, available: true, sort: 13 },
  { id: 'bb-coca-15', category: 'drink', name: 'Coca-Cola', size: '1,5 litros', price: 2500, available: true, sort: 20 },
  { id: 'bb-cocazero-15', category: 'drink', name: 'Coca-Cola Zero', size: '1,5 litros', price: 2500, available: true, sort: 21 },
  { id: 'bb-fanta-15', category: 'drink', name: 'Fanta', size: '1,5 litros', price: 2500, available: true, sort: 22 },
  { id: 'bb-sprite-15', category: 'drink', name: 'Sprite', size: '1,5 litros', price: 2500, available: true, sort: 23 },
]

export const ORDER_STATUSES = [
  { id: 'recibido', label: 'Recibido', emoji: '📝' },
  { id: 'preparando', label: 'En el horno', emoji: '🔥' },
  { id: 'en_camino', label: 'En camino', emoji: '🛵' },
  { id: 'entregado', label: 'Entregado', emoji: '✅' },
  { id: 'cancelado', label: 'Cancelado', emoji: '✖️' },
]

export const PAYMENT_METHODS = [
  { id: 'efectivo', label: 'Efectivo al recibir' },
  { id: 'transferencia', label: 'Transferencia' },
]
