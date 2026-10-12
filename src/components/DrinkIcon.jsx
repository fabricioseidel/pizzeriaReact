// Lata o botella dibujada en SVG, con un color según el nombre de la bebida.
const COLORS = [
  [/zero|light/i, '#1d1d1d', '#e63946'],
  [/coca/i, '#d62828', '#ffffff'],
  [/fanta|naranja/i, '#f77f00', '#1d4ed8'],
  [/sprite|lim[oó]n/i, '#2d9b4f', '#fcbf49'],
  [/pepsi/i, '#1d4ed8', '#ffffff'],
  [/agua/i, '#6cc5f0', '#ffffff'],
]

export default function DrinkIcon({ name, big }) {
  const [, body, accent] = COLORS.find(([re]) => re.test(name)) || [null, '#7a6558', '#fcbf49']
  if (big) {
    return (
      <svg viewBox="0 0 40 80" aria-hidden>
        <rect x="15" y="2" width="10" height="6" rx="1.5" fill={accent} stroke="#2b1d16" strokeWidth="1.5" />
        <path d="M16 8 h8 v8 q8 6 8 16 v40 q0 6 -6 6 h-12 q-6 0 -6 -6 v-40 q0 -10 8 -16 z" fill={body} fillOpacity=".9" stroke="#2b1d16" strokeWidth="1.5" />
        <rect x="8" y="38" width="24" height="18" fill={accent} />
        <path d="M11 47 q9 -6 18 0" stroke={body} strokeWidth="2.5" fill="none" />
        <rect x="11" y="22" width="3" height="12" rx="1.5" fill="#fff" opacity=".35" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 40 60" aria-hidden>
      <rect x="7" y="4" width="26" height="52" rx="5" fill={body} stroke="#2b1d16" strokeWidth="1.5" />
      <rect x="9" y="2" width="22" height="5" rx="2" fill="#c9c9c9" stroke="#2b1d16" strokeWidth="1.5" />
      <rect x="9" y="53" width="22" height="5" rx="2" fill="#c9c9c9" stroke="#2b1d16" strokeWidth="1.5" />
      <path d="M8 30 q12 -8 24 0" stroke={accent} strokeWidth="3" fill="none" />
      <rect x="11" y="12" width="3" height="34" rx="1.5" fill="#fff" opacity=".3" />
    </svg>
  )
}
