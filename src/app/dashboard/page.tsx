'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { WeeklyAssignment } from '@/lib/types'
import { getWeekStart, DAYS, getDayLabel } from '@/lib/dates'
import { CheckCircle2, AlertCircle } from 'lucide-react'

export default function DashboardPage() {
  const { user, profile, household, members, loading } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [myTasks, setMyTasks] = useState<WeeklyAssignment[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [loading, user])

  useEffect(() => {
    if (!loading && user && household) {
      if (!household) {
        router.replace('/dashboard/onboarding')
        return
      }
      loadMyTasks()
    }
  }, [loading, user, household])

  async function loadMyTasks() {
    const weekStart = getWeekStart()
    const { data } = await supabase
      .from('weekly_assignments')
      .select('*, chore:chore_definitions(*)')
      .eq('profile_id', user!.id)
      .eq('week_start', weekStart)
      .order('day_of_week')

    setMyTasks(data ?? [])
    setTasksLoading(false)
  }

  async function toggleComplete(id: string, current: boolean) {
    await supabase.from('weekly_assignments').update({ completed: !current }).eq('id', id)
    setMyTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !current } : t))
  }

  if (loading) return <LoadingSkeleton />
  if (!user || !profile) return null

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof typeof DAYS
  const todayTasks = myTasks.filter(t => t.day_of_week === today)
  const completedCount = myTasks.filter(t => t.completed).length
  const totalCount = myTasks.length
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div>
      {/* Header */}
      <div className="ht-header-gradient" style={{ paddingBottom: 48 }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ opacity: 0.8, fontSize: 14, marginBottom: 4 }}>
            {household?.name ?? 'Mi Casa'} 🏠
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>
            Hola, {profile.name.split(' ')[0]} 👋
          </h1>
          <p style={{ opacity: 0.75, fontSize: 14 }}>
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      <div className="ht-page" style={{ marginTop: -28, paddingTop: 0 }}>
        {/* Progress card */}
        <div className="ht-card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Tu semana</span>
            <span style={{
              background: 'var(--ht-purple-light)', color: 'var(--ht-purple)',
              borderRadius: 20, padding: '2px 10px', fontSize: 13, fontWeight: 700,
            }}>
              {completedCount}/{totalCount} ✓
            </span>
          </div>
          <div style={{ height: 8, background: 'var(--ht-surface-2)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${percent}%`,
              background: 'linear-gradient(90deg, var(--ht-purple), var(--ht-pink))',
              borderRadius: 4, transition: 'width 0.4s ease',
            }} />
          </div>
          <p style={{ fontSize: 12, color: 'var(--ht-text-3)', marginTop: 6 }}>
            {percent === 100 ? '🎉 ¡Semana completada!' : `${100 - percent}% restante esta semana`}
          </p>
        </div>

        {/* Today's tasks */}
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontWeight: 700, fontSize: 16, marginBottom: 10, color: 'var(--ht-text)' }}>
            Hoy — {getDayLabel(today)}
          </h2>
          {tasksLoading ? (
            <div style={{ color: 'var(--ht-text-3)', fontSize: 14 }}>Cargando...</div>
          ) : todayTasks.length === 0 ? (
            <div className="ht-card" style={{ textAlign: 'center', color: 'var(--ht-text-3)', fontSize: 14 }}>
              🎉 Sin tareas asignadas hoy
            </div>
          ) : (
            todayTasks.map(task => (
              <div key={task.id} className="ht-card" style={{
                marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <button
                  onClick={() => toggleComplete(task.id, task.completed)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {task.completed
                    ? <CheckCircle2 size={26} color="var(--ht-green)" fill="var(--ht-green-light)" />
                    : <AlertCircle size={26} color="var(--ht-yellow)" />
                  }
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{task.chore?.icon}</span>
                    <span style={{ textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? 'var(--ht-text-3)' : 'var(--ht-text)' }}>
                      {task.chore?.name}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ht-text-3)', textTransform: 'capitalize' }}>
                    {task.chore?.difficulty} · {task.chore?.category}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Members overview */}
        {members.length > 0 && (
          <div>
            <h2 style={{ fontWeight: 700, fontSize: 16, marginBottom: 10 }}>
              Integrantes
            </h2>
            <div style={{ display: 'flex', gap: 10 }}>
              {members.map((m, i) => (
                <div key={m.id} className="ht-card" style={{ flex: 1, textAlign: 'center', padding: 12 }}>
                  <div className={`ht-avatar member-color-${i % 5}`} style={{ margin: '0 auto 6px' }}>
                    {m.profile?.avatar_url
                      ? <img src={m.profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : m.profile?.name?.[0]?.toUpperCase()
                    }
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ht-text)' }}>
                    {m.profile?.name?.split(' ')[0]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div>
      <div style={{ height: 140, background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }} />
      <div className="ht-page" style={{ marginTop: -28 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 72, background: '#f3f0ff', borderRadius: 12, marginBottom: 12,
            animation: 'pulse 1.5s infinite' }} />
        ))}
      </div>
    </div>
  )
}
