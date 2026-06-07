'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { WeeklyAssignment, ChoreDefinition, Profile } from '@/lib/types'
import { getWeekStart, ORDERED_DAYS, DAY_LABELS, DAY_LABELS_FULL, isRestrictedDay, getTodayDayOfWeek } from '@/lib/dates'
import { Plus, ChevronLeft, ChevronRight, Settings, Check } from 'lucide-react'
import ManageChoresModal from '@/components/ManageChoresModal'
import AssignChoreModal from '@/components/AssignChoreModal'

export default function SchedulePage() {
  const { user, household, members } = useAuth()
  const supabase = createClient()

  const [weekStart, setWeekStart] = useState(getWeekStart())
  const [assignments, setAssignments] = useState<WeeklyAssignment[]>([])
  const [chores, setChores] = useState<ChoreDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [showManage, setShowManage] = useState(false)
  const [assignTarget, setAssignTarget] = useState<{ day: string; member: Profile } | null>(null)

  const isCurrentWeek = weekStart === getWeekStart()
  const today = getTodayDayOfWeek()

  const load = useCallback(async () => {
    if (!household) return
    setLoading(true)

    const [{ data: asgn }, { data: choreDefs }] = await Promise.all([
      supabase
        .from('weekly_assignments')
        .select('*, chore:chore_definitions(*), profile:profiles(*)')
        .eq('household_id', household.id)
        .eq('week_start', weekStart),
      supabase
        .from('chore_definitions')
        .select('*')
        .eq('household_id', household.id)
        .order('name'),
    ])

    setAssignments(asgn ?? [])
    setChores(choreDefs ?? [])
    setLoading(false)
  }, [household, weekStart])

  useEffect(() => { load() }, [load])

  function prevWeek() {
    const d = new Date(weekStart)
    d.setDate(d.getDate() - 7)
    setWeekStart(d.toISOString().split('T')[0])
  }

  function nextWeek() {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 7)
    setWeekStart(d.toISOString().split('T')[0])
  }

  async function toggleComplete(id: string, current: boolean) {
    await supabase.from('weekly_assignments').update({ completed: !current }).eq('id', id)
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, completed: !current } : a))
  }

  async function removeAssignment(id: string) {
    await supabase.from('weekly_assignments').delete().eq('id', id)
    setAssignments(prev => prev.filter(a => a.id !== id))
  }

  function getAssignmentsForDayMember(day: string, memberId: string) {
    return assignments.filter(a => a.day_of_week === day && a.profile_id === memberId)
  }

  function weekLabel() {
    const start = new Date(weekStart + 'T12:00:00')
    const end = new Date(weekStart + 'T12:00:00')
    end.setDate(end.getDate() + 4)
    const fmt = (d: Date) => d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
    return `${fmt(start)} – ${fmt(end)}`
  }

  const memberColors = ['#7c3aed', '#ec4899', '#f97316', '#10b981', '#3b82f6']

  return (
    <div>
      {/* Header */}
      <div className="ht-header-gradient" style={{ paddingBottom: 24 }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800 }}>Calendario</h1>
            <button onClick={() => setShowManage(true)} style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 10,
              color: 'white', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Settings size={15} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Tareas</span>
            </button>
          </div>

          {/* Week navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={prevWeek} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, color: 'white', padding: '6px 8px', cursor: 'pointer' }}>
              <ChevronLeft size={18} />
            </button>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{weekLabel()}</div>
              {isCurrentWeek && <div style={{ fontSize: 11, opacity: 0.7 }}>Semana actual</div>}
            </div>
            <button onClick={nextWeek} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, color: 'white', padding: '6px 8px', cursor: 'pointer' }}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="ht-page" style={{ marginTop: 12 }}>
        {loading ? (
          <div style={{ color: 'var(--ht-text-3)', textAlign: 'center', padding: 40 }}>Cargando semana...</div>
        ) : (
          <>
            {/* Grid header — days */}
            <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(5,1fr)', gap: 6, marginBottom: 8 }}>
              <div />
              {ORDERED_DAYS.map(day => (
                <div key={day} style={{
                  textAlign: 'center', fontSize: 11, fontWeight: 700,
                  color: day === today && isCurrentWeek ? 'var(--ht-purple)' : 'var(--ht-text-3)',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  background: day === today && isCurrentWeek ? 'var(--ht-purple-light)' : 'transparent',
                  borderRadius: 6, padding: '4px 2px',
                }}>
                  {DAY_LABELS[day]}
                  {isRestrictedDay(day) && <div style={{ fontSize: 8, color: 'var(--ht-orange)' }}>ligero</div>}
                </div>
              ))}
            </div>

            {/* Grid rows — one per member */}
            {members.map((member, mi) => (
              <div key={member.id} style={{ display: 'grid', gridTemplateColumns: '80px repeat(5,1fr)', gap: 6, marginBottom: 10 }}>
                {/* Member label */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 4 }}>
                  <div className="ht-avatar" style={{ background: memberColors[mi % 5], width: 32, height: 32, fontSize: 12 }}>
                    {member.profile?.avatar_url
                      ? <img src={member.profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      : member.profile?.name?.[0]?.toUpperCase()
                    }
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--ht-text-3)', marginTop: 2, textAlign: 'center', maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {member.profile?.name?.split(' ')[0]}
                  </span>
                </div>

                {/* Day cells */}
                {ORDERED_DAYS.map(day => {
                  const dayAssignments = getAssignmentsForDayMember(day, member.profile_id)
                  const isRestricted = isRestrictedDay(day)

                  return (
                    <div key={day} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {dayAssignments.map(a => (
                        <div
                          key={a.id}
                          onClick={() => toggleComplete(a.id, a.completed)}
                          style={{
                            background: a.completed
                              ? 'var(--ht-green-light)'
                              : isRestricted ? 'var(--ht-orange-light)' : 'var(--ht-purple-light)',
                            borderRadius: 8, padding: '6px 4px', textAlign: 'center',
                            fontSize: 10, fontWeight: 600, cursor: 'pointer',
                            opacity: a.completed ? 0.7 : 1,
                            transition: 'all 0.15s',
                            position: 'relative',
                            minHeight: 44,
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', gap: 2,
                          }}
                        >
                          {a.completed && (
                            <div style={{
                              position: 'absolute', top: 2, right: 2,
                              color: 'var(--ht-green)',
                            }}>
                              <Check size={10} strokeWidth={3} />
                            </div>
                          )}
                          <span style={{ fontSize: 14 }}>{a.chore?.icon}</span>
                          <span style={{
                            color: a.completed ? 'var(--ht-green)' : isRestricted ? 'var(--ht-orange)' : 'var(--ht-purple)',
                            lineHeight: 1.1,
                          }}>
                            {a.chore?.name}
                          </span>
                        </div>
                      ))}

                      {/* Add button */}
                      {member.profile_id === user?.id && (
                        <button
                          onClick={() => setAssignTarget({ day, member: member.profile! })}
                          style={{
                            background: 'transparent', border: '1.5px dashed var(--ht-line)',
                            borderRadius: 8, padding: '6px 4px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            minHeight: 36, transition: 'all 0.15s', color: 'var(--ht-text-3)',
                          }}
                        >
                          <Plus size={14} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}

            {/* Legend */}
            <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
              {[
                { color: 'var(--ht-purple-light)', text: 'Tarea asignada', textColor: 'var(--ht-purple)' },
                { color: 'var(--ht-orange-light)', text: 'Día restringido', textColor: 'var(--ht-orange)' },
                { color: 'var(--ht-green-light)', text: 'Completada', textColor: 'var(--ht-green)' },
              ].map(({ color, text, textColor }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--ht-text-3)' }}>
                  <div style={{ width: 12, height: 12, background: color, borderRadius: 3, border: `1.5px solid ${textColor}` }} />
                  {text}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showManage && (
        <ManageChoresModal
          household={household!}
          chores={chores}
          onClose={() => setShowManage(false)}
          onUpdate={setChores}
        />
      )}

      {assignTarget && (
        <AssignChoreModal
          day={assignTarget.day}
          member={assignTarget.member}
          chores={chores}
          weekStart={weekStart}
          householdId={household!.id}
          onClose={() => setAssignTarget(null)}
          onAssigned={(newA) => {
            setAssignments(prev => [...prev, newA])
            setAssignTarget(null)
          }}
        />
      )}
    </div>
  )
}
