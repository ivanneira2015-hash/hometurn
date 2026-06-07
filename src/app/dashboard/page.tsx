'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { WeeklyAssignment } from '@/lib/types'
import { getWeekStart, getTodayDayOfWeek, DAY_LABELS_FULL } from '@/lib/dates'
import { CheckCircle2, Circle, CalendarDays, Users } from 'lucide-react'

const MEMBER_GRAD = [
  'linear-gradient(135deg,#4f46e5,#a78bfa)',
  'linear-gradient(135deg,#10b981,#6ee7b7)',
  'linear-gradient(135deg,#f97316,#fbbf24)',
  'linear-gradient(135deg,#3b82f6,#93c5fd)',
  'linear-gradient(135deg,#f43f5e,#fb7185)',
]
const MEMBER_SHADOW = ['rgba(79,70,229,0.3)','rgba(16,185,129,0.3)','rgba(249,115,22,0.3)','rgba(59,130,246,0.3)','rgba(244,63,94,0.3)']

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
  const todayTasks = today ? myTasks.filter(t => t.day_of_week === today) : []
  const completed = myTasks.filter(t => t.completed).length
  const total = myTasks.length
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0
  const todayLabel = today ? DAY_LABELS_FULL[today] : 'Hoy'

  return (
    <div>
      <div className="ht-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ht-text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>
              {household.name}
            </p>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--ht-text)', letterSpacing: '-0.02em' }}>
              Hola, {profile.name.split(' ')[0]}
            </h1>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: 9999, overflow: 'hidden', background: MEMBER_GRAD[0], flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 800, color: 'white', boxShadow: `0 4px 12px ${MEMBER_SHADOW[0]}` }}>
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : profile.name[0].toUpperCase()
            }
          </div>
        </div>
      </div>

      <div className="ht-page" style={{ paddingTop: 16 }}>

        {/* Bento: progress + percent */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 10, marginBottom: 12 }}>
          <div className="ht-card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <CalendarDays size={15} color="var(--ht-primary)" />
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--ht-text)' }}>Esta semana</span>
            </div>
            <div style={{ height: 8, background: 'rgba(99,102,241,0.1)', borderRadius: 9999, overflow: 'hidden', marginBottom: 6 }}>
              <div style={{
                height: '100%', width: `${percent}%`,
                background: percent === 100 ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,#4f46e5,#a78bfa)',
                borderRadius: 9999, transition: 'width 0.5s ease',
              }} />
            </div>
            <p style={{ fontSize: 12, color: 'var(--ht-text-3)', fontWeight: 500 }}>
              {percent === 100 ? '¡Semana completada!' : `${completed} de ${total} completadas`}
            </p>
          </div>
          <div className="ht-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: percent === 100 ? 'rgba(16,185,129,0.12)' : 'rgba(79,70,229,0.08)' }}>
            <span style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.03em', color: percent === 100 ? 'var(--ht-mint)' : 'var(--ht-primary)', lineHeight: 1 }}>{percent}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ht-text-3)' }}>%</span>
          </div>
        </div>

        {/* Today */}
        <div style={{ marginBottom: 16 }}>
          <p className="ht-section-label">{todayLabel}</p>
          {tasksLoading ? (
            <div className="ht-card" style={{ height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="ht-spinner ht-spinner-dark" />
            </div>
          ) : todayTasks.length === 0 ? (
            <div className="ht-card" style={{ textAlign: 'center', color: 'var(--ht-text-3)', fontSize: 14, padding: '24px 16px' }}>
              Sin tareas asignadas hoy
            </div>
          ) : todayTasks.map(task => (
            <button key={task.id} onClick={() => toggleComplete(task.id, task.completed)} className="ht-list-item"
              style={{ width: '100%', cursor: 'pointer', textAlign: 'left', background: task.completed ? 'rgba(16,185,129,0.08)' : 'var(--ht-glass)', border: `1px solid ${task.completed ? 'rgba(16,185,129,0.2)' : 'var(--ht-glass-border)'}` }}>
              {task.completed ? <CheckCircle2 size={22} color="var(--ht-mint)" /> : <Circle size={22} color="rgba(99,102,241,0.25)" />}
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: 15, color: task.completed ? 'var(--ht-text-3)' : 'var(--ht-text)', textDecoration: task.completed ? 'line-through' : 'none' }}>{task.chore?.name}</p>
                <p style={{ fontSize: 12, color: 'var(--ht-text-4)', textTransform: 'capitalize' }}>{task.chore?.category}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Members bento */}
        <div>
          <p className="ht-section-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Users size={11} /> Integrantes
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(members.length, 3)}, 1fr)`, gap: 10 }}>
            {members.map((m, i) => (
              <div key={m.id} className="ht-card" style={{ textAlign: 'center', padding: '16px 8px' }}>
                <div style={{ width: 40, height: 40, borderRadius: 9999, background: MEMBER_GRAD[i % 5], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: 'white', margin: '0 auto 8px', overflow: 'hidden', boxShadow: `0 4px 12px ${MEMBER_SHADOW[i % 5]}` }}>
                  {m.profile?.avatar_url ? <img src={m.profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : m.profile?.name?.[0]?.toUpperCase()}
                </div>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ht-text)' }}>{m.profile?.name?.split(' ')[0]}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div>
      <div style={{ height: 80, background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.4)' }} />
      <div className="ht-page" style={{ paddingTop: 16 }}>
        {[1,2,3].map(i => <div key={i} style={{ height: 72, background: 'rgba(255,255,255,0.5)', borderRadius: 24, marginBottom: 12 }} />)}
      </div>
    </div>
  )
}
