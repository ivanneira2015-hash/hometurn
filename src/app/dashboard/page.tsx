'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { WeeklyAssignment } from '@/lib/types'
import { getWeekStart, getTodayDayOfWeek, DAY_LABELS_FULL } from '@/lib/dates'
import { CheckCircle2, Circle, Users, Calendar } from 'lucide-react'

const MEMBER_COLORS = ['#6366f1','#10b981','#f97316','#3b82f6','#ec4899']

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
  const todayLabel = today ? DAY_LABELS_FULL[today] : ''

  return (
    <div>
      {/* Header */}
      <div className="ht-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: 12, color: 'var(--ht-text-3)', marginBottom: 2, fontWeight: 500 }}>
              {household.name}
            </p>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--ht-text)' }}>
              Hola, {profile.name.split(' ')[0]}
            </h1>
          </div>
          <div style={{
            width: 40, height: 40, borderRadius: '50%', overflow: 'hidden',
            background: 'var(--ht-indigo)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'white',
            flexShrink: 0,
          }}>
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : profile.name[0].toUpperCase()
            }
          </div>
        </div>
      </div>

      <div className="ht-page" style={{ paddingTop: 16 }}>

        {/* Progress */}
        <div className="ht-card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={16} color="var(--ht-indigo)" />
              <span style={{ fontWeight: 700, fontSize: 14 }}>Esta semana</span>
            </div>
            <span className="ht-badge ht-badge-indigo">{completed}/{total} listas</span>
          </div>
          <div style={{ height: 6, background: 'var(--ht-line)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${percent}%`,
              background: percent === 100 ? 'var(--ht-green)' : 'var(--ht-indigo)',
              borderRadius: 3, transition: 'width 0.4s ease',
            }} />
          </div>
          <p style={{ fontSize: 12, color: 'var(--ht-text-3)', marginTop: 6 }}>
            {percent === 100 ? 'Semana completada' : `${100 - percent}% restante`}
          </p>
        </div>

        {/* Today */}
        <div style={{ marginBottom: 16 }}>
          <p className="ht-section-label">{todayLabel || 'Hoy'}</p>
          {tasksLoading ? (
            <div style={{ height: 72, background: 'var(--ht-line-2)', borderRadius: 12, animation: 'pulse 1.5s infinite' }} />
          ) : todayTasks.length === 0 ? (
            <div className="ht-card" style={{ textAlign: 'center', color: 'var(--ht-text-3)', fontSize: 14, padding: '24px 16px' }}>
              Sin tareas asignadas hoy
            </div>
          ) : (
            todayTasks.map(task => (
              <button
                key={task.id}
                onClick={() => toggleComplete(task.id, task.completed)}
                className="ht-list-item"
                style={{ width: '100%', cursor: 'pointer', textAlign: 'left', background: 'none' }}
              >
                {task.completed
                  ? <CheckCircle2 size={22} color="var(--ht-green)" />
                  : <Circle size={22} color="var(--ht-text-4)" />
                }
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontWeight: 600, fontSize: 15,
                    color: task.completed ? 'var(--ht-text-4)' : 'var(--ht-text)',
                    textDecoration: task.completed ? 'line-through' : 'none',
                  }}>
                    {task.chore?.name}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--ht-text-3)', textTransform: 'capitalize' }}>
                    {task.chore?.category} · {task.chore?.difficulty === 'light' ? 'Liviana' : task.chore?.difficulty === 'medium' ? 'Moderada' : 'Pesada'}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Members */}
        <div>
          <p className="ht-section-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={12} /> Integrantes
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {members.map((m, i) => (
              <div key={m.id} className="ht-card" style={{ flex: 1, textAlign: 'center', padding: '12px 8px' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: MEMBER_COLORS[i % 5],
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, color: 'white', margin: '0 auto 6px',
                  overflow: 'hidden',
                }}>
                  {m.profile?.avatar_url
                    ? <img src={m.profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : m.profile?.name?.[0]?.toUpperCase()
                  }
                </div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--ht-text-2)' }}>
                  {m.profile?.name?.split(' ')[0]}
                </p>
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
      <div style={{ height: 80, background: 'var(--ht-surface)', borderBottom: '1px solid var(--ht-line)' }} />
      <div className="ht-page" style={{ paddingTop: 16 }}>
        {[1,2,3].map(i => (
          <div key={i} style={{ height: 72, background: 'var(--ht-line-2)', borderRadius: 12, marginBottom: 12 }} />
        ))}
      </div>
    </div>
  )
}
