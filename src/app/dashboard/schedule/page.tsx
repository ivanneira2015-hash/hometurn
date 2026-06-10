'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { WeeklyAssignment, ChoreDefinition, Profile } from '@/lib/types'
import { getWeekStart, ORDERED_DAYS, DAY_LABELS, getTodayDayOfWeek } from '@/lib/dates'
import { Plus, ChevronLeft, ChevronRight, Settings, Check, LayoutTemplate, RefreshCw } from 'lucide-react'
import ManageChoresModal from '@/components/ManageChoresModal'
import AssignChoreModal from '@/components/AssignChoreModal'
import TemplatesModal from '@/components/TemplatesModal'
import { MEMBER_GRAD, MEMBER_GLOW, MEMBER_LIGHT, MEMBER_BORDER, MEMBER_SOLID as MEMBER_COLORS } from '@/lib/colors'

export default function SchedulePage() {
  const { user, profile, household, members } = useAuth()
  const supabase = createClient()
  const [weekStart, setWeekStart] = useState(getWeekStart())
  const [assignments, setAssignments] = useState<WeeklyAssignment[]>([])
  const [chores, setChores] = useState<ChoreDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [showManage, setShowManage] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [rotating, setRotating] = useState(false)
  const [assignTarget, setAssignTarget] = useState<{ day: string; member: Profile } | null>(null)
  const [actionTarget, setActionTarget] = useState<WeeklyAssignment | null>(null)

  const isCurrentWeek = weekStart === getWeekStart()
  const today = getTodayDayOfWeek()

  const load = useCallback(async () => {
    if (!household) return
    setLoading(true)
    const [{ data: asgn }, { data: choreDefs }] = await Promise.all([
      supabase.from('weekly_assignments')
        .select('*, chore:chore_definitions(*), profile:profiles(*)')
        .eq('household_id', household.id)
        .eq('week_start', weekStart),
      supabase.from('chore_definitions').select('*')
        .eq('household_id', household.id).order('name'),
    ])
    setAssignments(asgn ?? [])
    setChores(choreDefs ?? [])
    setLoading(false)
  }, [household, weekStart])

  useEffect(() => { load() }, [load])

  function prevWeek() {
    const d = new Date(weekStart); d.setDate(d.getDate() - 7)
    setWeekStart(d.toISOString().split('T')[0])
  }
  function nextWeek() {
    const d = new Date(weekStart); d.setDate(d.getDate() + 7)
    setWeekStart(d.toISOString().split('T')[0])
  }

  async function toggleComplete(id: string, current: boolean) {
    await supabase.from('weekly_assignments').update({ completed: !current }).eq('id', id)
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, completed: !current } : a))
    setActionTarget(null)

    // Notificar al hogar cuando se completa una tarea
    if (!current && household && profile) {
      const assignment = assignments.find(a => a.id === id)
      const choreName = assignment?.chore?.name ?? 'una tarea'
      const otherMembers = members.filter(m => m.profile_id !== profile.id)
      if (otherMembers.length > 0) {
        await supabase.from('notifications').insert(
          otherMembers.map(m => ({
            household_id: household.id,
            for_profile_id: m.profile_id,
            from_profile_id: profile.id,
            type: 'task_completed',
            title: `${profile.name.split(' ')[0]} completó una tarea`,
            body: choreName,
          }))
        )
      }
    }
  }

  async function deleteAssignment(id: string) {
    await supabase.from('weekly_assignments').delete().eq('id', id)
    setAssignments(prev => prev.filter(a => a.id !== id))
    setActionTarget(null)
  }

  function weekLabel() {
    const start = new Date(weekStart + 'T12:00:00')
    const end = new Date(weekStart + 'T12:00:00'); end.setDate(end.getDate() + 4)
    const fmt = (d: Date) => d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
    return `${fmt(start)} – ${fmt(end)}`
  }

  function getForDayMember(day: string, memberId: string) {
    return assignments.filter(a => a.day_of_week === day && a.profile_id === memberId)
  }

  async function rotateWeek() {
    if (members.length < 2) return
    setRotating(true)
    // Get previous week's assignments
    const prevWeekDate = new Date(weekStart + 'T12:00:00')
    prevWeekDate.setDate(prevWeekDate.getDate() - 7)
    const prevWeek = prevWeekDate.toISOString().split('T')[0]

    const { data: prevAssignments } = await supabase
      .from('weekly_assignments').select('*')
      .eq('household_id', household!.id).eq('week_start', prevWeek)

    if (!prevAssignments || prevAssignments.length === 0) {
      setRotating(false)
      return
    }

    // Delete current week
    await supabase.from('weekly_assignments')
      .delete().eq('household_id', household!.id).eq('week_start', weekStart)

    // Rotate: each member gets the next member's tasks
    const rotated = prevAssignments.map(a => {
      const idx = members.findIndex(m => m.profile_id === a.profile_id)
      const nextMember = members[(idx + 1) % members.length]
      return {
        household_id: household!.id,
        week_start: weekStart,
        profile_id: nextMember.profile_id,
        chore_id: a.chore_id,
        day_of_week: a.day_of_week,
        completed: false,
      }
    })

    const { data: newAssignments } = await supabase
      .from('weekly_assignments').insert(rotated)
      .select('*, chore:chore_definitions(*), profile:profiles(*)')

    if (newAssignments) setAssignments(newAssignments as WeeklyAssignment[])
    setRotating(false)
  }

  return (
    <div>
      <div className="ht-page-header" style={{ paddingRight: 52 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Calendario</h1>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setShowTemplates(true)} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px',
              background: 'var(--ht-surface-2)', border: '1px solid var(--ht-line)', borderRadius: 8,
              color: 'var(--ht-text-3)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              <LayoutTemplate size={14} />
            </button>
            <button onClick={rotateWeek} disabled={rotating} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px',
              background: 'var(--ht-surface-2)', border: '1px solid var(--ht-line)', borderRadius: 8,
              color: 'var(--ht-text-3)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              <RefreshCw size={14} className={rotating ? 'spinning' : ''} />
            </button>
            <button onClick={() => setShowManage(true)} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px',
              background: 'var(--ht-indigo-light)', border: 'none', borderRadius: 8,
              color: 'var(--ht-indigo)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              <Settings size={14} /> Tareas
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={prevWeek} style={{ background: 'var(--ht-surface-2)', border: '1px solid var(--ht-line)', borderRadius: 8, padding: '5px 8px', cursor: 'pointer' }}>
            <ChevronLeft size={16} color="var(--ht-text-3)" />
          </button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ht-text)' }}>{weekLabel()}</p>
            {isCurrentWeek && <p style={{ fontSize: 11, color: 'var(--ht-indigo)', fontWeight: 500 }}>Semana actual</p>}
          </div>
          <button onClick={nextWeek} style={{ background: 'var(--ht-surface-2)', border: '1px solid var(--ht-line)', borderRadius: 8, padding: '5px 8px', cursor: 'pointer' }}>
            <ChevronRight size={16} color="var(--ht-text-3)" />
          </button>
        </div>
      </div>

      <div className="ht-page" style={{ paddingTop: 12 }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--ht-text-3)', padding: 40, fontSize: 14 }}>Cargando semana...</div>
        ) : (
          <>
            {/* Empty week CTA */}
            {assignments.length === 0 && isCurrentWeek && !loading && (
              <div style={{
                background: 'rgba(124,58,237,0.06)', border: '1.5px dashed rgba(200,149,108,0.25)',
                borderRadius: 20, padding: '20px 16px', marginBottom: 14, textAlign: 'center',
              }}>
                <p style={{ fontWeight: 800, fontSize: 15, color: 'var(--ht-purple)', marginBottom: 4 }}>Semana nueva, sin tareas aún</p>
                <p style={{ fontSize: 13, color: 'var(--ht-text-3)', marginBottom: 14 }}>
                  Rotá desde la semana anterior o elegí una plantilla para empezar rápido
                </p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button onClick={rotateWeek} disabled={rotating} className="ht-btn ht-btn-primary" style={{ fontSize: 13 }}>
                    <RefreshCw size={14} className={rotating ? 'spinning' : ''} /> Rotar semana anterior
                  </button>
                  <button onClick={() => setShowTemplates(true)} className="ht-btn ht-btn-ghost" style={{ fontSize: 13 }}>
                    <LayoutTemplate size={14} /> Plantillas
                  </button>
                </div>
              </div>
            )}

            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '72px repeat(5,1fr)', gap: 4, marginBottom: 6 }}>
              <div />
              {ORDERED_DAYS.map(day => (
                <div key={day} style={{
                  textAlign: 'center', fontSize: 10, fontWeight: 700,
                  color: day === today && isCurrentWeek ? 'var(--ht-indigo)' : 'var(--ht-text-4)',
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                  background: day === today && isCurrentWeek ? 'var(--ht-indigo-light)' : 'transparent',
                  borderRadius: 6, padding: '4px 2px',
                }}>
                  {DAY_LABELS[day]}
                </div>
              ))}
            </div>

            {/* Member rows */}
            {members.map((member, mi) => (
              <div key={member.id} style={{ display: 'grid', gridTemplateColumns: '72px repeat(5,1fr)', gap: 4, marginBottom: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 4, gap: 4 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 9999,
                    background: MEMBER_GRAD[mi % 5],
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 900, color: 'white', overflow: 'hidden',
                    boxShadow: `0 3px 8px ${MEMBER_GLOW[mi % 5]}`,
                  }}>
                    {member.profile?.avatar_url
                      ? <img src={member.profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : member.profile?.name?.[0]?.toUpperCase()
                    }
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--ht-text-3)', textAlign: 'center', maxWidth: 68, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {member.profile?.name?.split(' ')[0]}
                  </span>
                </div>

                {ORDERED_DAYS.map(day => {
                  const dayItems = getForDayMember(day, member.profile_id)
                  return (
                    <div key={day} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {dayItems.map(a => (
                        <button
                          key={a.id}
                          onClick={() => setActionTarget(a)}
                          className="ht-chore-chip"
                          style={{
                            background: a.completed
                              ? 'rgba(4,120,87,0.08)'
                              : MEMBER_LIGHT[mi % 5],
                            color: a.completed ? 'var(--ht-mint)' : MEMBER_COLORS[mi % 5],
                            border: `1.5px solid ${a.completed ? 'rgba(4,120,87,0.25)' : MEMBER_BORDER[mi % 5]}`,
                            width: '100%', position: 'relative',
                            backdropFilter: 'blur(8px)',
                            boxShadow: a.completed ? 'none' : `0 2px 8px ${MEMBER_GLOW[mi % 5]}`,
                            minHeight: 58,
                          }}
                        >
                          {a.completed && (
                            <div style={{
                              position: 'absolute', top: 3, right: 3,
                              width: 14, height: 14, borderRadius: 9999,
                              background: 'var(--ht-mint)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <Check size={8} color="white" strokeWidth={3} />
                            </div>
                          )}
                          <span style={{ fontSize: 9, lineHeight: 1.3, textAlign: 'center', fontWeight: 800, padding: '0 2px' }}>{a.chore?.name}</span>
                        </button>
                      ))}
                      <button
                        onClick={() => setAssignTarget({ day, member: member.profile! })}
                        style={{
                          background: 'transparent', border: '1.5px dashed var(--ht-line)',
                          borderRadius: 8, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          minHeight: 32, color: 'var(--ht-text-4)',
                        }}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  )
                })}
              </div>
            ))}

            {/* Legend */}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              {[
                { bg: 'var(--ht-indigo-light)', border: '#e0e7ff', text: 'Asignada' },
                { bg: 'var(--ht-green-light)', border: '#a7f3d0', text: 'Completada' },
              ].map(({ bg, border, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--ht-text-3)' }}>
                  <div style={{ width: 12, height: 12, background: bg, borderRadius: 3, border: `1.5px solid ${border}` }} />
                  {text}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showManage && (
        <ManageChoresModal household={household!} chores={chores} onClose={() => setShowManage(false)} onUpdate={setChores} />
      )}
      {showTemplates && (
        <TemplatesModal
          householdId={household!.id}
          members={members}
          chores={chores}
          currentAssignments={assignments}
          weekStart={weekStart}
          onClose={() => setShowTemplates(false)}
          onApplied={newAssignments => { setAssignments(newAssignments); setShowTemplates(false) }}
        />
      )}
      {assignTarget && (
        <AssignChoreModal
          day={assignTarget.day} member={assignTarget.member}
          chores={chores} weekStart={weekStart} householdId={household!.id}
          onClose={() => setAssignTarget(null)}
          onAssigned={newA => { setAssignments(prev => [...prev, newA]); setAssignTarget(null) }}
        />
      )}

      {/* Action sheet — tap on chore chip */}
      {actionTarget && (
        <>
          <div className="ht-overlay" onClick={() => setActionTarget(null)} />
          <div className="ht-modal" style={{ padding: '20px 16px 32px' }}>
            {/* Handle */}
            <div style={{ width: 36, height: 4, background: 'rgba(99,102,241,0.2)', borderRadius: 9999, margin: '0 auto 20px' }} />

            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ht-text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
              Tarea
            </p>
            <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--ht-text)', marginBottom: 20 }}>
              {actionTarget.chore?.name}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => toggleComplete(actionTarget.id, actionTarget.completed)}
                className="ht-btn"
                style={{
                  background: actionTarget.completed ? 'rgba(99,102,241,0.08)' : 'rgba(4,120,87,0.08)',
                  color: actionTarget.completed ? 'var(--ht-primary)' : 'var(--ht-mint)',
                  border: `1.5px solid ${actionTarget.completed ? 'rgba(99,102,241,0.2)' : 'rgba(16,185,129,0.2)'}`,
                  width: '100%', justifyContent: 'center', fontSize: 15,
                }}
              >
                {actionTarget.completed ? 'Marcar como pendiente' : 'Marcar como completada'}
              </button>

              <button
                onClick={() => deleteAssignment(actionTarget.id)}
                className="ht-btn ht-btn-danger"
                style={{ width: '100%', justifyContent: 'center', fontSize: 15 }}
              >
                Eliminar asignación
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
