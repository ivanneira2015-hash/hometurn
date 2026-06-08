'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { WeeklyAssignment } from '@/lib/types'
import { getWeekStart, getTodayDayOfWeek, DAY_LABELS_FULL } from '@/lib/dates'
import { CheckCircle2, Circle, CalendarDays, Sparkles } from 'lucide-react'

const MEMBER_GRAD = [
  'linear-gradient(135deg,#7c3aed,#a78bfa)',
  'linear-gradient(135deg,#f43f5e,#fb7185)',
  'linear-gradient(135deg,#f59e0b,#fbbf24)',
  'linear-gradient(135deg,#10b981,#34d399)',
  'linear-gradient(135deg,#3b82f6,#60a5fa)',
]
const MEMBER_GLOW = [
  '0 4px 16px rgba(124,58,237,0.35)',
  '0 4px 16px rgba(244,63,94,0.35)',
  '0 4px 16px rgba(245,158,11,0.35)',
  '0 4px 16px rgba(16,185,129,0.35)',
  '0 4px 16px rgba(59,130,246,0.35)',
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

  const today = getTodayDayOfWeek()
  const todayLabel = today ? DAY_LABELS_FULL[today] : 'Hoy'
  const todayTasks = today ? myTasks.filter(t => t.day_of_week === today) : []
  const completed = myTasks.filter(t => t.completed).length
  const total = myTasks.length
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div>
      {/* ── Hero header ── */}
      <div style={{
        padding: '28px 16px 20px',
        background: 'rgba(253,244,255,0.7)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.5)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--ht-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              {household.name}
            </p>
            <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              <span>Hola, </span>
              <span className="ht-gradient-text">{profile.name.split(' ')[0]}</span>
              <span style={{ fontSize: 24 }}> 👋</span>
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

        {/* ── BENTO ROW 1: Progress (2/3) + Percent (1/3) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 84px', gap: 10, marginBottom: 10 }}>

          {/* Progress card */}
          <div className="ht-card ht-card-purple" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 9999, background: 'var(--ht-grad)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CalendarDays size={14} color="white" strokeWidth={2.5} />
              </div>
              <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--ht-purple)' }}>Esta semana</span>
            </div>
            <div style={{ height: 10, background: 'rgba(124,58,237,0.12)', borderRadius: 9999, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{
                height: '100%', width: `${percent}%`,
                background: percent === 100 ? 'linear-gradient(90deg,#10b981,#34d399)' : 'var(--ht-grad)',
                borderRadius: 9999, transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
              }} />
            </div>
            <p style={{ fontSize: 12, color: 'var(--ht-purple)', fontWeight: 600, opacity: 0.7 }}>
              {percent === 100 ? '¡Semana completada!' : `${completed} de ${total} listas`}
            </p>
          </div>

          {/* Percent bento — square */}
          <div className="ht-card" style={{
            padding: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: percent === 100 ? 'rgba(16,185,129,0.12)' : 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(244,63,94,0.08))',
            border: `1px solid ${percent === 100 ? 'rgba(16,185,129,0.2)' : 'rgba(124,58,237,0.15)'}`,
            minHeight: 84,
          }}>
            <span style={{
              fontSize: 30, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1,
              background: percent === 100 ? 'linear-gradient(135deg,#10b981,#34d399)' : 'var(--ht-grad)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>{percent}</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ht-text-3)', marginTop: 1 }}>%</span>
          </div>
        </div>

        {/* ── BENTO ROW 2: Today (full) ── */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <p className="ht-section-label" style={{ marginBottom: 0 }}>{todayLabel}</p>
            {todayTasks.length > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ht-rose)', background: 'var(--ht-rose-light)', padding: '2px 8px', borderRadius: 9999, border: '1px solid rgba(244,63,94,0.15)' }}>
                {todayTasks.filter(t => !t.completed).length} pendientes
              </span>
            )}
          </div>

          {tasksLoading ? (
            <div className="ht-card" style={{ height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="ht-spinner ht-spinner-dark" />
            </div>
          ) : todayTasks.length === 0 ? (
            <div className="ht-card" style={{ textAlign: 'center', padding: '24px 16px' }}>
              <Sparkles size={20} color="var(--ht-amber)" style={{ margin: '0 auto 8px', display: 'block' }} />
              <p style={{ fontSize: 14, color: 'var(--ht-text-3)', fontWeight: 600 }}>Día libre — sin tareas asignadas</p>
            </div>
          ) : todayTasks.map(task => (
            <button
              key={task.id}
              onClick={() => toggleComplete(task.id, task.completed)}
              className="ht-list-item"
              style={{
                width: '100%', cursor: 'pointer', textAlign: 'left',
                background: task.completed ? 'rgba(16,185,129,0.08)' : 'var(--ht-glass-warm)',
                border: `1px solid ${task.completed ? 'rgba(16,185,129,0.2)' : 'var(--ht-glass-border)'}`,
              }}
            >
              {task.completed
                ? <CheckCircle2 size={24} color="var(--ht-mint)" />
                : <Circle size={24} color="rgba(124,58,237,0.25)" />
              }
              <div style={{ flex: 1 }}>
                <p style={{
                  fontWeight: 800, fontSize: 15,
                  color: task.completed ? 'var(--ht-text-3)' : 'var(--ht-text)',
                  textDecoration: task.completed ? 'line-through' : 'none',
                }}>
                  {task.chore?.name}
                </p>
                <p style={{ fontSize: 12, color: 'var(--ht-text-3)', textTransform: 'capitalize', fontWeight: 500 }}>
                  {task.chore?.category}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* ── BENTO ROW 3: Members — asymmetric ── */}
        <div>
          <p className="ht-section-label">Integrantes</p>

          {members.length === 3 ? (
            /* 3 members — row of 2 + 1 full */
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
    </div>
  )
}

function MemberCard({ name, avatar, grad, glow, isMe, wide }: {
  name?: string; avatar?: string | null; grad: string; glow: string; isMe: boolean; wide?: boolean
}) {
  const first = name?.split(' ')[0] ?? '?'
  return (
    <div className="ht-card" style={{
      padding: '16px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
      flexDirection: wide ? 'row' : 'column',
      textAlign: wide ? 'left' : 'center',
    }}>
      <div style={{
        width: wide ? 44 : 48, height: wide ? 44 : 48,
        borderRadius: 9999, background: grad,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: wide ? 17 : 19, fontWeight: 900, color: 'white',
        overflow: 'hidden', flexShrink: 0,
        boxShadow: glow,
      }}>
        {avatar
          ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : first[0]?.toUpperCase()
        }
      </div>
      <div style={{ flex: wide ? 1 : undefined }}>
        <p style={{ fontWeight: 800, fontSize: 14, color: 'var(--ht-text)' }}>{first}</p>
        {isMe && (
          <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--ht-purple)', background: 'var(--ht-purple-light)', padding: '1px 7px', borderRadius: 9999 }}>
            Vos
          </span>
        )}
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div>
      <div style={{ height: 88, background: 'rgba(253,244,255,0.7)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.5)' }} />
      <div className="ht-page" style={{ paddingTop: 16 }}>
        {[100, 72, 80].map((h, i) => (
          <div key={i} style={{ height: h, background: 'rgba(255,255,255,0.5)', borderRadius: 24, marginBottom: 10 }} />
        ))}
      </div>
    </div>
  )
}
