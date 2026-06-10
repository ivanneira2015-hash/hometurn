'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Home, TrendingUp, CalendarRange, MoreHorizontal, CheckSquare, User, X, Search, Bell } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/hooks/useNotifications'
import NotificationBell from '@/components/NotificationBell'

// Listas en el nav principal, Semana en el sheet
const MAIN_NAV = [
  { href: '/dashboard',           icon: Home,         label: 'Inicio'   },
  { href: '/dashboard/tasks',     icon: CheckSquare,  label: 'Listas'   },
  { href: '/dashboard/finances',  icon: TrendingUp,   label: 'Finanzas' },
  { href: '/dashboard/agenda',    icon: CalendarRange, label: 'Agenda'  },
]

const MORE_ITEMS = [
  { href: '/dashboard/schedule',  icon: CalendarDays, label: 'Semana',  desc: 'Calendario y tareas del hogar' },
  { href: '/dashboard/search',    icon: Search,       label: 'Buscar',  desc: 'Eventos, gastos, listas y más' },
  { href: '/dashboard/profile',   icon: User,         label: 'Perfil',  desc: 'Hogar, código de invitación'  },
]

export default function BottomNav() {
  const pathname = usePathname()
  const [showMore, setShowMore] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const { user, household } = useAuth()
  const { unreadCount } = useNotifications(user?.id, household?.id)

  const isMoreActive = MORE_ITEMS.some(i => pathname.startsWith(i.href))

  return (
    <>
      <nav className="ht-bottom-nav">
        {MAIN_NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link key={href} href={href} className={`ht-nav-item${active ? ' active' : ''}`} style={{ padding: '6px 10px' }}>
              <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
              <span>{label}</span>
            </Link>
          )
        })}

        {/* Más button */}
        <button
          onClick={() => setShowMore(true)}
          className={`ht-nav-item${isMoreActive ? ' active' : ''}`}
          style={{ padding: '6px 10px', position: 'relative' }}
        >
          <MoreHorizontal size={20} strokeWidth={1.8} />
          {unreadCount > 0 && (
            <div style={{
              position: 'absolute', top: 4, right: 8,
              width: 14, height: 14, borderRadius: 9999,
              background: 'var(--ht-rose)', border: '2px solid rgba(18,10,45,0.9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8, fontWeight: 900, color: 'white',
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
          <span>Más</span>
        </button>
      </nav>

      {/* "Más" sheet */}
      {showMore && (
        <>
          <div
            onClick={() => setShowMore(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(18,6,40,0.35)',
              backdropFilter: 'blur(3px)',
              zIndex: 60,
              animation: 'fadeIn 0.15s ease',
            }}
          />
          <div style={{
            position: 'fixed',
            bottom: 92, left: '50%', transform: 'translateX(-50%)',
            width: 'calc(100% - 32px)', maxWidth: 400,
            background: 'rgba(18,10,45,0.94)',
            backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 24, padding: '8px',
            zIndex: 61,
            boxShadow: '0 -4px 40px rgba(0,0,0,0.3)',
            animation: 'slideUp 0.2s cubic-bezier(0.16,1,0.3,1)',
          }}>
            {/* Notificaciones */}
            <button
              onClick={() => { setShowMore(false); setShowNotif(true) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, width: '100%',
                padding: '14px 16px', borderRadius: 16, textDecoration: 'none',
                background: 'transparent', border: 'none', cursor: 'pointer',
                transition: 'background 0.15s', textAlign: 'left',
              }}
            >
              <div style={{ position: 'relative', width: 40, height: 40, borderRadius: 9999, background: unreadCount > 0 ? 'linear-gradient(135deg,#7c3aed,#be185d)' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bell size={18} color={unreadCount > 0 ? 'white' : 'rgba(255,255,255,0.6)'} strokeWidth={2} />
                {unreadCount > 0 && (
                  <div style={{ position: 'absolute', top: -3, right: -3, width: 16, height: 16, borderRadius: 9999, background: 'var(--ht-rose)', border: '2px solid rgba(18,10,45,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900, color: 'white' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
                  Notificaciones {unreadCount > 0 && <span style={{ color: 'var(--ht-rose)', fontSize: 13 }}>({unreadCount})</span>}
                </p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>Actividad del hogar</p>
              </div>
            </button>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '2px 0' }} />

            {MORE_ITEMS.map(({ href, icon: Icon, label, desc }) => {
              const active = pathname.startsWith(href)
              return (
                <Link key={href} href={href} onClick={() => setShowMore(false)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 16, textDecoration: 'none', background: active ? 'rgba(200,149,108,0.3)' : 'transparent', transition: 'background 0.15s' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 9999, background: active ? 'linear-gradient(135deg,#7c3aed,#be185d)' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={18} color={active ? 'white' : 'rgba(255,255,255,0.6)'} strokeWidth={2} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: active ? 'white' : 'rgba(255,255,255,0.85)' }}>{label}</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>{desc}</p>
                  </div>
                </Link>
              )
            })}

            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '2px 0' }} />
            <button onClick={() => setShowMore(false)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', borderRadius: 16, background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 600 }}>
              <X size={14} /> Cerrar
            </button>
          </div>
        </>
      )}

      {/* Panel de notificaciones — con z-index correcto sobre el sheet */}
      {showNotif && user && household && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
          <NotificationBell
            userId={user.id}
            householdId={household.id}
            forceOpen
            onClose={() => setShowNotif(false)}
          />
        </div>
      )}
    </>
  )
}
