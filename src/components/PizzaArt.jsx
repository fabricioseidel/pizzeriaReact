import { useId, useMemo } from 'react'

// Pizza dibujada en SVG: masa, pomodoro, mozzarella y los ingredientes elegidos.

function seeded(str) {
  let h = 2166136261
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

function layout(toppings) {
  const placed = []
  const n = toppings.length
  const count = Math.max(4, Math.round(11 - n * 1.3))
  return toppings.map((t) => {
    const rnd = seeded(t.id + n)
    const pieces = []
    for (let k = 0; k < count; k++) {
      let best
      for (let tries = 0; tries < 40; tries++) {
        const r = 62 * Math.sqrt(rnd())
        const a = rnd() * Math.PI * 2
        const p = { x: 100 + r * Math.cos(a), y: 100 + r * Math.sin(a), rot: rnd() * 360 }
        const minD = placed.reduce((m, q) => Math.min(m, Math.hypot(p.x - q.x, p.y - q.y)), 99)
        if (!best || minD > best.minD) best = { ...p, minD }
        if (minD > 19) break
      }
      placed.push(best)
      pieces.push(best)
    }
    return { ...t, pieces }
  })
}

function Piece({ visual, color, x, y, rot }) {
  const t = `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(0)})`
  switch (visual) {
    case 'pepperoni':
      return (
        <g transform={t}>
          <circle r="11" fill="#B5172B" stroke="#7F0E1C" strokeWidth="1.5" />
          <circle cx="-4" cy="-3" r="1.6" fill="#7F0E1C" />
          <circle cx="4" cy="2" r="1.3" fill="#7F0E1C" />
          <circle cx="-1" cy="5" r="1.1" fill="#7F0E1C" />
          <circle cx="-3" cy="-5" r="3" fill="#fff" opacity=".18" />
        </g>
      )
    case 'jamon':
      return (
        <g transform={t}>
          <rect x="-9" y="-7" width="18" height="14" rx="4" fill="#F4A6A6" stroke="#D97777" strokeWidth="1.4" />
          <path d="M-5 -2 Q0 -5 5 -1" stroke="#fff" strokeWidth="1.4" fill="none" opacity=".6" />
        </g>
      )
    case 'cebolla':
      return (
        <g transform={t} fill="none" strokeLinecap="round">
          <path d="M-8 0 A8 8 0 0 1 8 0" stroke="#B57EDC" strokeWidth="3" />
          <path d="M-5 1 A5 5 0 0 1 5 1" stroke="#E7C6FF" strokeWidth="2.2" />
        </g>
      )
    case 'champinon':
      return (
        <g transform={t}>
          <path d="M-10 1 Q-10 -10 0 -10 Q10 -10 10 1 Z" fill="#E8D5B5" stroke="#9C7F5A" strokeWidth="1.4" />
          <rect x="-3.5" y="0" width="7" height="8" rx="2" fill="#F3E6CF" stroke="#9C7F5A" strokeWidth="1.4" />
          <path d="M-6 -3 L6 -3" stroke="#C7A97F" strokeWidth="1" />
        </g>
      )
    case 'tomate':
      return (
        <g transform={t}>
          <circle r="10.5" fill="#E63946" stroke="#B3122A" strokeWidth="1.4" />
          <circle r="6.5" fill="#FF6B6B" />
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="0" cy="-3.6" rx="1" ry="1.7" fill="#FFD6A5" transform={`rotate(${a})`} />
          ))}
        </g>
      )
    case 'albahaca':
      return (
        <g transform={t}>
          <path d="M-10 0 Q0 -8 10 0 Q0 8 -10 0 Z" fill="#2D6A4F" stroke="#1B4332" strokeWidth="1" />
          <path d="M-8 0 L8 0" stroke="#74C69D" strokeWidth="1" />
        </g>
      )
    case 'mozzarella':
      return (
        <g transform={t}>
          <path d="M-9 -2 Q-8 -9 0 -9 Q9 -8 9 0 Q8 8 0 8 Q-9 8 -9 -2 Z" fill="#FFFDF4" stroke="#F1E3B5" strokeWidth="1.2" />
          <circle cx="-2" cy="-3" r="2" fill="#fff" />
        </g>
      )
    default:
      return (
        <g transform={t}>
          <circle r="6.5" fill={color || '#E9C46A'} stroke="rgba(0,0,0,.25)" strokeWidth="1.2" />
          <circle cx="-2" cy="-2" r="2" fill="#fff" opacity=".35" />
        </g>
      )
  }
}

export default function PizzaArt({ toppings = [], size = 200, className = '', animate = false, title }) {
  const gid = useId().replace(/:/g, '')
  const groups = useMemo(() => layout(toppings), [toppings])
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className={className} role="img" aria-label={title || 'Pizza'}>
      <defs>
        <radialGradient id={`crust${gid}`} cx="50%" cy="45%" r="55%">
          <stop offset="78%" stopColor="#F2B65A" />
          <stop offset="92%" stopColor="#D9892E" />
          <stop offset="100%" stopColor="#A85D17" />
        </radialGradient>
        <radialGradient id={`cheese${gid}`} cx="45%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FFE7A3" />
          <stop offset="100%" stopColor="#FBC85F" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="104" r="96" fill="rgba(0,0,0,.18)" />
      <circle cx="100" cy="100" r="96" fill={`url(#crust${gid})`} />
      {[20, 70, 130, 200, 250, 310].map((a) => (
        <circle key={a} cx={100 + 90 * Math.cos((a * Math.PI) / 180)} cy={100 + 90 * Math.sin((a * Math.PI) / 180)} r="2.2" fill="#8C4A12" opacity=".45" />
      ))}
      <circle cx="100" cy="100" r="82" fill="#C1121F" />
      <path
        d="M100 22 C130 20 160 35 172 62 C184 90 178 128 160 150 C140 174 108 182 80 174 C52 166 28 142 22 112 C17 82 30 50 56 34 C70 25 86 22 100 22 Z"
        fill={`url(#cheese${gid})`}
      />
      <circle cx="70" cy="70" r="10" fill="#FFF1C9" opacity=".7" />
      <circle cx="132" cy="118" r="12" fill="#FFF1C9" opacity=".6" />
      <circle cx="84" cy="136" r="7" fill="#FFF1C9" opacity=".6" />
      {groups.map((g, gi) => (
        <g key={g.id} className={animate ? 'topping-pop' : undefined} style={animate ? { animationDelay: `${gi * 40}ms` } : undefined}>
          {g.pieces.map((p, i) => (
            <Piece key={i} visual={g.visual} color={g.color} {...p} />
          ))}
        </g>
      ))}
    </svg>
  )
}
