'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { WeeklyAssignment } from '@/lib/types'
import { getWeekStart, getTodayDayOfWeek, DAY_LABELS_FULL } from '@/lib/dates'
import { CheckCircle2, Circle, CalendarDays, TrendingUp, CalendarRange, CheckSquare, Sparkles, ArrowRight } from 'lucide-react'
import { MEMBER_GRAD, MEMBER_GLOW } from '@/lib/colors'

const HUB_MODULES = [
  {
    href: '/dashboard/schedule',
    icon: CalendarDays,
    label: 'Semana',
    desc: 'Tareas y calendario',
    grad: 'linear-gradient(135deg,#7c3aed,#a78bfa)',
    glow: 'rgba(124,58,237,0.25)',
    light: 'rgba(124,58,237,0.08)',
    border: 'rgba(124,58,237,0.2)',
  },
  {
    href: '/dashboard/finances',
    icon: TrendingUp,
    label: 'Finanzas',
    desc: 'Gastos e ingresos',
    grad: 'linear-gradient(135deg,#7c3aed,#be185d)',
    glow: 'rgba(4,120,87,0.2)',
    light: 'rgba(4,120,87,0.07)',
    border: 'rgba(16,185,129,0.2)',
  },
  {
    href: '/dashboard/agenda',
    icon: CalendarRange,
    label: 'Agenda',
    desc: 'Eventos y recordatorios',
    grad: 'linear-gradient(135deg,#be185d,#f43f8e)',
    glow: 'rgba(244,63,94,0.25)',
    light: 'rgba(190,24,93,0.07)',
    border: 'rgba(190,24,93,0.15)',
  },
  {
    href: '/dashboard/tasks',
    icon: CheckSquare,
    label: 'Listas',
    desc: 'Compras y pendientes',
    grad: 'linear-gradient(135deg,#f59e0b,#fbbf24)',
    glow: 'rgba(245,158,11,0.25)',
    light: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.2)',
  },
]

export default function DashboardPage() {
  const { user, profile, household, members, loading } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [myTasks, setMyTasks] = useState<WeeklyAssignment[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/login'); return }
    if (!household) { router.replace('/dashboard/onboarding'); return }
    loadMyTasks()
  }, [loading, user, household])

  async function loadMyTasks() {
    const { data } = await supabase
      .from('weekly_assignments')
      .select('*, chore:chore_definitions(*)')
      .eq('profile_id', user!.id)
      .eq('week_start', getWeekStart())
      .order('day_of_week')
    setMyTasks(data ?? [])
    setTasksLoading(false)
  }

  async function toggleComplete(id: string, current: boolean) {
    await supabase.from('weekly_assignments').update({ completed: !current }).eq('id', id)
    setMyTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !current } : t))
  }

  if (loading) return <LoadingSkeleton />
  if (!user || !profile || !household) return null

  // Saludo según hora del día
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
  const greetingEmoji = hour < 12 ? '🌅' : hour < 19 ? '☀️' : '🌙'

  const today = getTodayDayOfWeek()
  const todayLabel = today ? DAY_LABELS_FULL[today] : 'Hoy'
  const todayTasks = today ? myTasks.filter(t => t.day_of_week === today) : []
  const completed = myTasks.filter(t => t.completed).length
  const total = myTasks.length
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div>
      {/* Hero header */}
      <div style={{
        padding: '28px 16px 20px',
        background: 'rgba(253,244,255,0.75)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.5)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--ht-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              {household.name}
            </p>
            <p style={{ fontSize: 12, color: 'var(--ht-text-3)', fontWeight: 600, marginBottom: 2 }}>
              {greetingEmoji} {greeting}
            </p>
            <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              <span className="ht-gradient-text">{profile.name.split(' ')[0]}</span>
            </h1>
          </div>
          <div style={{
            width: 48, height: 48, borderRadius: 9999, overflow: 'hidden',
            background: MEMBER_GRAD[0], flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 900, color: 'white',
            boxShadow: MEMBER_GLOW[0],
          }}>
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : profile.name[0].toUpperCase()
            }
          </div>
        </div>
      </div>

      <div className="ht-page" style={{ paddingTop: 16 }}>

        {/* ── Bento: Progress + % ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 84px', gap: 10, marginBottom: 12 }}>
          <div className="ht-card ht-card-purple" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
              <div style={{ width: 26, height: 26, borderRadius: 9999, background: 'var(--ht-grad)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CalendarDays size={13} color="white" strokeWidth={2.5} />
              </div>
              <span style={{ fontWeight: 800, fontSize: 12, color: 'var(--ht-purple)' }}>Semana actual</span>
            </div>
            <div style={{ height: 10, background: 'rgba(124,58,237,0.12)', borderRadius: 9999, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{
                height: '100%', width: `${percent}%`,
                background: percent === 100 ? 'linear-gradient(90deg,#047857,#059669)' : 'var(--ht-grad)',
                borderRadius: 9999, transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
              }} />
            </div>
            <p style={{ fontSize: 12, color: 'var(--ht-purple)', fontWeight: 600, opacity: 0.7 }}>
              {percent === 100 ? '¡Semana completada!' : `${completed} de ${total} tareas`}
            </p>
          </div>
          <div className="ht-card" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: percent === 100 ? 'rgba(4,120,87,0.1)' : 'linear-gradient(135deg,rgba(124,58,237,0.1),rgba(190,24,93,0.05))',
            border: `1px solid ${percent === 100 ? 'rgba(16,185,129,0.2)' : 'rgba(124,58,237,0.15)'}`,
            padding: 0, minHeight: 84,
          }}>
            <span style={{
              fontSize: 30, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1,
              background: percent === 100 ? 'linear-gradient(135deg,#7c3aed,#be185d)' : 'var(--ht-grad)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>{percent}</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ht-text-3)', marginTop: 1 }}>%</span>
          </div>
        </div>

        {/* ── Tareas de hoy ── */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <p className="ht-section-label" style={{ marginBottom: 0 }}>{todayLabel}</p>
            {todayTasks.filter(t => !t.completed).length > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ht-rose)', background: 'var(--ht-rose-light)', padding: '2px 8px', borderRadius: 9999, border: '1px solid rgba(190,24,93,0.12)' }}>
                {todayTasks.filter(t => !t.completed).length} pendientes
              </span>
            )}
          </div>

          {tasksLoading ? (
            <div className="ht-card" style={{ height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="ht-spinner ht-spinner-dark" />
            </div>
          ) : todayTasks.length === 0 ? (
            <div className="ht-card" style={{ textAlign: 'center', padding: '20px 16px' }}>
              <Sparkles size={18} color="var(--ht-amber)" style={{ margin: '0 auto 6px', display: 'block' }} />
              <p style={{ fontSize: 14, color: 'var(--ht-text-3)', fontWeight: 600 }}>Sin tareas hoy</p>
            </div>
          ) : todayTasks.slice(0, 3).map(task => (
            <button key={task.id} onClick={() => toggleComplete(task.id, task.completed)} className="ht-list-item"
              style={{ width: '100%', cursor: 'pointer', textAlign: 'left', background: task.completed ? 'rgba(4,120,87,0.07)' : 'var(--ht-glass-warm)', border: `1px solid ${task.completed ? 'rgba(16,185,129,0.2)' : 'var(--ht-glass-border)'}` }}>
              {task.completed ? <CheckCircle2 size={22} color="var(--ht-mint)" /> : <Circle size={22} color="rgba(124,58,237,0.25)" />}
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 800, fontSize: 15, color: task.completed ? 'var(--ht-text-3)' : 'var(--ht-text)', textDecoration: task.completed ? 'line-through' : 'none' }}>{task.chore?.name}</p>
                <p style={{ fontSize: 12, color: 'var(--ht-text-3)', textTransform: 'capitalize', fontWeight: 500 }}>{task.chore?.category}</p>
              </div>
            </button>
          ))}

          {todayTasks.length > 3 && (
            <Link href="/dashboard/schedule" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '10px', fontSize: 13, fontWeight: 700, color: 'var(--ht-purple)', textDecoration: 'none' }}>
              Ver todas ({todayTasks.length}) <ArrowRight size={13} />
            </Link>
          )}
        </div>

        {/* ── Hub — módulos ── */}
        <p className="ht-section-label">Módulos</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {HUB_MODULES.map(({ href, icon: Icon, label, desc, grad, glow, light, border }) => (
            <Link key={href} href={href} style={{ textDecoration: 'none' }}>
              <div style={{
                padding: '18px 16px', borderRadius: 20,
                background: light, border: `1px solid ${border}`,
                backdropFilter: 'blur(12px)',
                boxShadow: `0 4px 16px ${glow}`,
                cursor: 'pointer', transition: 'transform 0.15s',
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 9999, background: grad, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, boxShadow: `0 4px 12px ${glow}` }}>
                  <Icon size={19} color="white" strokeWidth={2.2} />
                </div>
                <p style={{ fontWeight: 800, fontSize: 15, color: 'var(--ht-text)', marginBottom: 2 }}>{label}</p>
                <p style={{ fontSize: 11, color: 'var(--ht-text-3)', fontWeight: 500 }}>{desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* ── Integrantes ── */}
        <p className="ht-section-label">Integrantes</p>
        {members.length === 3 ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              {members.slice(0, 2).map((m, i) => (
                <MemberCard key={m.id} name={m.profile?.name} avatar={m.profile?.avatar_url} grad={MEMBER_GRAD[i % 5]} glow={MEMBER_GLOW[i % 5]} isMe={m.profile_id === user?.id} />
              ))}
            </div>
            <MemberCard name={members[2]?.profile?.name} avatar={members[2]?.profile?.avatar_url} grad={MEMBER_GRAD[2]} glow={MEMBER_GLOW[2]} isMe={members[2]?.profile_id === user?.id} wide />
          </>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(members.length, 3)}, 1fr)`, gap: 10 }}>
            {members.map((m, i) => (
              <MemberCard key={m.id} name={m.profile?.name} avatar={m.profile?.avatar_url} grad={MEMBER_GRAD[i % 5]} glow={MEMBER_GLOW[i % 5]} isMe={m.profile_id === user?.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MemberCard({ name, avatar, grad, glow, isMe, wide }: {
  name?: string; avatar?: string | null; grad: string; glow: string; isMe: boolean; wide?: boolean
}) {
  const first = name?.split(' ')[0] ?? '?'
  return (
    <div className="ht-card" style={{ padding: '14px', display: 'flex', alignItems: 'center', gap: 10, flexDirection: wide ? 'row' : 'column', textAlign: wide ? 'left' : 'center' }}>
      <div style={{ width: wide ? 40 : 44, height: wide ? 40 : 44, borderRadius: 9999, background: grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: wide ? 15 : 17, fontWeight: 900, color: 'white', overflow: 'hidden', flexShrink: 0, boxShadow: glow }}>
        {avatar ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : first[0]?.toUpperCase()}
      </div>
      <div style={{ flex: wide ? 1 : undefined }}>
        <p style={{ fontWeight: 800, fontSize: 14, color: 'var(--ht-text)' }}>{first}</p>
        {isMe && <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--ht-purple)', background: 'var(--ht-purple-light)', padding: '1px 7px', borderRadius: 9999 }}>Vos</span>}
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div>
      <div style={{ height: 88, background: 'rgba(253,244,255,0.75)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.5)' }} />
      <div className="ht-page" style={{ paddingTop: 16 }}>
        {[100, 72, 200, 80].map((h, i) => (
          <div key={i} style={{ height: h, background: 'rgba(255,255,255,0.5)', borderRadius: 24, marginBottom: 10 }} />
        ))}
      </div>
    </div>
  )
}
