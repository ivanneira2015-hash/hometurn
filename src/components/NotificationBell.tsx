'use client'

import { useState } from 'react'
import { Bell, X, CheckCheck, CalendarRange, TrendingUp, CheckSquare, Users } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { Notification } from '@/lib/types'

const TYPE_CONFIG = {
  transaction:    { icon: TrendingUp,    color: '#047857', bg: 'rgba(4,120,87,0.1)' },
  task_completed: { icon: CheckSquare,   color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
  event:          { icon: CalendarRange, color: '#b45309', bg: 'rgba(180,83,9,0.1)' },
  assignment:     { icon: Users,         color: '#4338ca', bg: 'rgba(67,56,202,0.1)' },
}

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60)   return 'ahora'
  if (diff < 3600) return `${Math.floor(diff/60)}m`
  if (diff < 86400) return `${Math.floor(diff/3600)}h`
  return `${Math.floor(diff/86400)}d`
}

interface Props {
  userId?: string
  householdId?: string
}

export default function NotificationBell({ userId, householdId }: Props) {
  const [open, setOpen] = useState(false)
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications(userId, householdId)

  function handleOpen() {
    setOpen(true)
  }

  return (
    <>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        style={{
          position: 'relative', background: 'rgba(124,58,237,0.08)',
          border: 'none', borderRadius: 9999, width: 36, height: 36,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0,
        }}
      >
        <Bell size={16} color="var(--ht-purple)" strokeWidth={2} />
        {unreadCount > 0 && (
          <div style={{
            position: 'absolute', top: -2, right: -2,
            width: 16, height: 16, borderRadius: 9999,
            background: 'var(--ht-rose)', border: '2px solid white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 900, color: 'white',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      {/* Notification sheet */}
      {open && (
        <>
          <div className="ht-overlay" onClick={() => setOpen(false)} />
          <div className="ht-modal">
            {/* Header */}
            <div style={{ padding: '20px 16px 0' }}>
              <div style={{ width: 36, height: 4, background: 'rgba(124,58,237,0.2)', borderRadius: 9999, margin: '0 auto 16px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Bell size={18} color="var(--ht-purple)" />
                  <h2 style={{ fontSize: 17, fontWeight: 800 }}>
                    Notificaciones {unreadCount > 0 && <span style={{ fontSize: 13, color: 'var(--ht-rose)', fontWeight: 700 }}>({unreadCount})</span>}
                  </h2>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} style={{ background: 'rgba(124,58,237,0.08)', border: 'none', borderRadius: 9999, padding: '6px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--ht-purple)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCheck size={13} /> Leer todo
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ht-text-3)', padding: 4 }}>
                    <X size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* List */}
            <div style={{ padding: '0 16px 32px', maxHeight: '65vh', overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ht-text-3)' }}>
                  <Bell size={32} color="rgba(124,58,237,0.2)" style={{ margin: '0 auto 12px', display: 'block' }} />
                  <p style={{ fontWeight: 700, marginBottom: 4 }}>Sin notificaciones</p>
                  <p style={{ fontSize: 13 }}>Cuando alguien del hogar agregue algo, aparecerá acá</p>
                </div>
              ) : notifications.map(n => (
                <NotifItem key={n.id} n={n} onRead={() => markRead(n.id)} />
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}

function NotifItem({ n, onRead }: { n: Notification; onRead: () => void }) {
  const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.transaction
  const Icon = cfg.icon
  return (
    <div
      onClick={onRead}
      style={{
        display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 16,
        background: n.read ? 'transparent' : 'rgba(124,58,237,0.05)',
        border: n.read ? '1px solid transparent' : '1px solid rgba(124,58,237,0.1)',
        marginBottom: 8, cursor: 'pointer', transition: 'all 0.15s',
        alignItems: 'flex-start',
      }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 9999, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={16} color={cfg.color} strokeWidth={2} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: n.read ? 600 : 800, fontSize: 14, color: 'var(--ht-text)', marginBottom: 2 }}>{n.title}</p>
        {n.body && <p style={{ fontSize: 12, color: 'var(--ht-text-3)' }}>{n.body}</p>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: 10, color: 'var(--ht-text-4)', fontWeight: 600 }}>{timeAgo(n.created_at)}</span>
        {!n.read && <div style={{ width: 8, height: 8, borderRadius: 9999, background: 'var(--ht-purple)' }} />}
      </div>
    </div>
  )
}
