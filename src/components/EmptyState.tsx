'use client'

type EmptyType = 'schedule' | 'tasks' | 'finances' | 'agenda' | 'notifications' | 'search' | 'list'

const ILLUSTRATIONS: Record<EmptyType, { svg: string; title: string; desc: string }> = {
  schedule: {
    title: 'Semana vacía',
    desc: 'Rotá desde la semana anterior o elegí una plantilla',
    svg: `<svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="20" width="120" height="80" rx="12" fill="rgba(124,58,237,0.08)" stroke="rgba(124,58,237,0.2)" stroke-width="1.5"/>
      <rect x="36" y="14" width="16" height="14" rx="4" fill="rgba(124,58,237,0.3)"/>
      <rect x="108" y="14" width="16" height="14" rx="4" fill="rgba(124,58,237,0.3)"/>
      <line x1="20" y1="46" x2="140" y2="46" stroke="rgba(124,58,237,0.15)" stroke-width="1.5"/>
      <rect x="32" y="56" width="20" height="16" rx="4" fill="rgba(124,58,237,0.12)"/>
      <rect x="60" y="56" width="20" height="16" rx="4" fill="rgba(190,24,93,0.12)"/>
      <rect x="88" y="56" width="20" height="16" rx="4" fill="rgba(180,83,9,0.12)"/>
      <rect x="116" y="56" width="20" height="16" rx="4" fill="rgba(124,58,237,0.12)"/>
      <rect x="32" y="80" width="20" height="8" rx="3" fill="rgba(124,58,237,0.08)"/>
      <rect x="60" y="80" width="20" height="8" rx="3" fill="rgba(124,58,237,0.08)"/>
      <circle cx="126" cy="88" r="14" fill="rgba(124,58,237,0.15)"/>
      <path d="M121 88h10M126 83v10" stroke="rgba(124,58,237,0.6)" stroke-width="2" stroke-linecap="round"/>
    </svg>`
  },
  tasks: {
    title: 'Sin listas',
    desc: 'Creá tu primera lista de compras o pendientes',
    svg: `<svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="30" y="16" width="100" height="88" rx="12" fill="rgba(180,83,9,0.08)" stroke="rgba(180,83,9,0.2)" stroke-width="1.5"/>
      <rect x="44" y="34" width="60" height="8" rx="4" fill="rgba(180,83,9,0.2)"/>
      <rect x="44" y="50" width="48" height="6" rx="3" fill="rgba(180,83,9,0.12)"/>
      <rect x="44" y="63" width="52" height="6" rx="3" fill="rgba(180,83,9,0.12)"/>
      <rect x="44" y="76" width="40" height="6" rx="3" fill="rgba(180,83,9,0.12)"/>
      <circle cx="37" cy="53" r="4" fill="none" stroke="rgba(180,83,9,0.3)" stroke-width="1.5"/>
      <circle cx="37" cy="66" r="4" fill="none" stroke="rgba(180,83,9,0.3)" stroke-width="1.5"/>
      <circle cx="37" cy="79" r="4" fill="rgba(180,83,9,0.3)"/>
      <path d="M34.5 79l2 2 3-3" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
      <circle cx="116" cy="92" r="16" fill="rgba(180,83,9,0.15)"/>
      <path d="M111 92h10M116 87v10" stroke="rgba(180,83,9,0.6)" stroke-width="2" stroke-linecap="round"/>
    </svg>`
  },
  finances: {
    title: 'Sin movimientos',
    desc: 'Agregá tu primer ingreso o gasto del mes',
    svg: `<svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="80" cy="56" r="40" fill="rgba(4,120,87,0.08)" stroke="rgba(4,120,87,0.2)" stroke-width="1.5"/>
      <text x="80" y="62" text-anchor="middle" font-size="28" font-weight="900" fill="rgba(4,120,87,0.3)">$</text>
      <path d="M56 90 Q70 80 80 84 Q90 88 104 78" stroke="rgba(4,120,87,0.3)" stroke-width="2" stroke-linecap="round" fill="none"/>
      <circle cx="56" cy="90" r="3" fill="rgba(4,120,87,0.3)"/>
      <circle cx="80" cy="84" r="3" fill="rgba(4,120,87,0.3)"/>
      <circle cx="104" cy="78" r="3" fill="rgba(4,120,87,0.3)"/>
      <rect x="24" y="22" width="18" height="18" rx="6" fill="rgba(4,120,87,0.12)"/>
      <rect x="118" y="22" width="18" height="18" rx="6" fill="rgba(190,24,93,0.12)"/>
      <path d="M28 31h10M33 26v10" stroke="rgba(4,120,87,0.4)" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M122 31h10" stroke="rgba(190,24,93,0.4)" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`
  },
  agenda: {
    title: 'Sin eventos próximos',
    desc: 'Tocá un día del calendario para agregar eventos',
    svg: `<svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="24" width="120" height="80" rx="12" fill="rgba(124,58,237,0.06)" stroke="rgba(124,58,237,0.18)" stroke-width="1.5"/>
      <rect x="20" y="24" width="120" height="28" rx="12" fill="rgba(124,58,237,0.12)"/>
      <rect x="20" y="38" width="120" height="14" fill="rgba(124,58,237,0.12)"/>
      <rect x="44" y="16" width="12" height="18" rx="4" fill="rgba(190,24,93,0.4)"/>
      <rect x="104" y="16" width="12" height="18" rx="4" fill="rgba(190,24,93,0.4)"/>
      <text x="80" y="43" text-anchor="middle" font-size="11" font-weight="700" fill="rgba(255,255,255,0.8)">JUNIO 2026</text>
      <circle cx="44" cy="70" r="8" fill="rgba(190,24,93,0.15)"/>
      <circle cx="68" cy="70" r="8" fill="rgba(124,58,237,0.15)"/>
      <circle cx="92" cy="70" r="8" fill="rgba(180,83,9,0.15)"/>
      <circle cx="116" cy="70" r="8" fill="rgba(124,58,237,0.15)"/>
      <text x="44" y="74" text-anchor="middle" font-size="9" font-weight="700" fill="rgba(190,24,93,0.5)">15</text>
      <text x="68" y="74" text-anchor="middle" font-size="9" font-weight="700" fill="rgba(124,58,237,0.5)">16</text>
      <text x="92" y="74" text-anchor="middle" font-size="9" font-weight="700" fill="rgba(180,83,9,0.5)">17</text>
      <text x="116" y="74" text-anchor="middle" font-size="9" font-weight="700" fill="rgba(124,58,237,0.5)">18</text>
      <rect x="32" y="86" width="96" height="6" rx="3" fill="rgba(124,58,237,0.06)"/>
    </svg>`
  },
  notifications: {
    title: 'Sin notificaciones',
    desc: 'Cuando alguien del hogar agregue algo, aparecerá acá',
    svg: `<svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M80 24 C60 24 50 40 50 56 L46 76 H114 L110 56 C110 40 100 24 80 24Z" fill="rgba(124,58,237,0.1)" stroke="rgba(124,58,237,0.25)" stroke-width="1.5"/>
      <rect x="70" y="76" width="20" height="8" rx="4" fill="rgba(124,58,237,0.2)"/>
      <circle cx="80" cy="22" r="5" fill="rgba(124,58,237,0.3)"/>
      <circle cx="108" cy="36" r="10" fill="rgba(190,24,93,0.2)" stroke="rgba(190,24,93,0.3)" stroke-width="1.5"/>
      <path d="M105 36h6M108 33v6" stroke="rgba(190,24,93,0.6)" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="60" y1="56" x2="78" y2="56" stroke="rgba(124,58,237,0.15)" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="60" y1="64" x2="100" y2="64" stroke="rgba(124,58,237,0.1)" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`
  },
  search: {
    title: 'Buscar en el hogar',
    desc: 'Eventos, gastos, listas y más',
    svg: `<svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="72" cy="56" r="32" fill="rgba(124,58,237,0.08)" stroke="rgba(124,58,237,0.2)" stroke-width="2"/>
      <line x1="96" y1="80" x2="116" y2="100" stroke="rgba(124,58,237,0.3)" stroke-width="3" stroke-linecap="round"/>
      <circle cx="72" cy="56" r="20" fill="rgba(124,58,237,0.06)" stroke="rgba(124,58,237,0.15)" stroke-width="1.5"/>
      <line x1="62" y1="52" x2="82" y2="52" stroke="rgba(124,58,237,0.25)" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="62" y1="58" x2="78" y2="58" stroke="rgba(124,58,237,0.2)" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="62" y1="64" x2="74" y2="64" stroke="rgba(124,58,237,0.15)" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`
  },
  list: {
    title: 'Lista vacía',
    desc: 'Agregá el primer ítem arriba',
    svg: `<svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="32" y="24" width="96" height="72" rx="12" fill="rgba(180,83,9,0.07)" stroke="rgba(180,83,9,0.18)" stroke-width="1.5"/>
      <rect x="48" y="42" width="16" height="6" rx="3" fill="rgba(180,83,9,0.2)"/>
      <rect x="70" y="42" width="40" height="6" rx="3" fill="rgba(180,83,9,0.1)"/>
      <rect x="48" y="56" width="16" height="6" rx="3" fill="rgba(180,83,9,0.1)"/>
      <rect x="70" y="56" width="32" height="6" rx="3" fill="rgba(180,83,9,0.07)"/>
      <rect x="48" y="70" width="16" height="6" rx="3" fill="rgba(180,83,9,0.07)"/>
      <rect x="70" y="70" width="36" height="6" rx="3" fill="rgba(180,83,9,0.05)"/>
      <circle cx="112" cy="96" r="14" fill="rgba(180,83,9,0.15)"/>
      <path d="M107 96h10M112 91v10" stroke="rgba(180,83,9,0.5)" stroke-width="2" stroke-linecap="round"/>
    </svg>`
  },
}

interface Props {
  type: EmptyType
  title?: string
  desc?: string
  action?: { label: string; onClick: () => void }
}

export default function EmptyState({ type, title, desc, action }: Props) {
  const cfg = ILLUSTRATIONS[type]
  return (
    <div style={{ textAlign: 'center', padding: '32px 24px' }}>
      <div
        style={{ width: 160, height: 120, margin: '0 auto 20px' }}
        dangerouslySetInnerHTML={{ __html: cfg.svg }}
      />
      <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--ht-text)', marginBottom: 6 }}>
        {title ?? cfg.title}
      </p>
      <p style={{ fontSize: 14, color: 'var(--ht-text-3)', lineHeight: 1.6, marginBottom: action ? 20 : 0 }}>
        {desc ?? cfg.desc}
      </p>
      {action && (
        <button onClick={action.onClick} className="ht-btn ht-btn-primary" style={{ margin: '0 auto' }}>
          {action.label}
        </button>
      )}
    </div>
  )
}
