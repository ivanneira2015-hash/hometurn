'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ScheduleTemplate, HouseholdMember, WeeklyAssignment, ChoreDefinition } from '@/lib/types'
import { X, Plus, Trash2, Check, LayoutTemplate } from 'lucide-react'
import { ORDERED_DAYS, DAY_LABELS, getWeekStart } from '@/lib/dates'

const MEMBER_COLORS = ['#6366f1','#10b981','#f97316','#3b82f6','#ec4899']
const MEMBER_LIGHT  = ['#eef2ff','#d1fae5','#fff7ed','#eff6ff','#fce7f3']

interface Props {
  householdId: string
  members: HouseholdMember[]
  chores: ChoreDefinition[]
  currentAssignments: WeeklyAssignment[]
  weekStart: string
  onClose: () => void
  onApplied: (assignments: WeeklyAssignment[]) => void
}

export default function TemplatesModal({ householdId, members, chores, currentAssignments, weekStart, onClose, onApplied }: Props) {
  const supabase = createClient()
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [applying, setApplying] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [showSave, setShowSave] = useState(false)

  useEffect(() => { loadTemplates() }, [])

  async function loadTemplates() {
    const { data } = await supabase
      .from('schedule_templates').select('*')
      .eq('household_id', householdId).order('created_at', { ascending: false })
    setTemplates(data ?? [])
    setLoading(false)
  }

  async function saveCurrentAsTemplate() {
    if (!newName.trim() || currentAssignments.length === 0) return
    setSaving(true)

    const slots = currentAssignments.map(a => {
      const memberIdx = members.findIndex(m => m.profile_id === a.profile_id)
      const chore = chores.find(c => c.id === a.chore_id)
      return {
        day: a.day_of_week,
        chore_name: chore?.name ?? '',
        member_slot: memberIdx,
        chore_id: a.chore_id,
        profile_id: a.profile_id,
      }
    })

    const { data } = await supabase.from('schedule_templates').insert({
      household_id: householdId,
      name: newName.trim(),
      description: `${currentAssignments.length} tareas`,
      preview_data: { slots },
    }).select().single()

    if (data) {
      setTemplates(prev => [data, ...prev])
      setNewName('')
      setShowSave(false)
    }
    setSaving(false)
  }

  async function applyTemplate(template: ScheduleTemplate) {
    setApplying(template.id)
    const slots = (template.preview_data as any)?.slots ?? []

    // Delete current week assignments
    await supabase.from('weekly_assignments')
      .delete().eq('household_id', householdId).eq('week_start', weekStart)

    // Remap to current member positions
    const inserts = slots.map((slot: any) => {
      const member = members[slot.member_slot] ?? members[0]
      return {
        household_id: householdId,
        week_start: weekStart,
        profile_id: member.profile_id,
        chore_id: slot.chore_id,
        day_of_week: slot.day,
        completed: false,
      }
    })

    const { data } = await supabase.from('weekly_assignments')
      .insert(inserts)
      .select('*, chore:chore_definitions(*), profile:profiles(*)')

    if (data) onApplied(data as WeeklyAssignment[])
    setApplying(null)
  }

  async function deleteTemplate(id: string) {
    await supabase.from('schedule_templates').delete().eq('id', id)
    setTemplates(prev => prev.filter(t => t.id !== id))
  }

  return (
    <>
      <div className="ht-overlay" onClick={onClose} />
      <div className="ht-modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 16px 16px', borderBottom: '1px solid var(--ht-line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LayoutTemplate size={18} color="var(--ht-indigo)" />
            <h2 style={{ fontSize: 17, fontWeight: 800 }}>Plantillas</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ht-text-3)', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Save current week */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--ht-line)', background: 'var(--ht-surface-2)' }}>
          {!showSave ? (
            <button
              onClick={() => setShowSave(true)}
              disabled={currentAssignments.length === 0}
              className="ht-btn ht-btn-ghost"
              style={{ width: '100%', fontSize: 13 }}
            >
              <Plus size={14} /> Guardar semana actual como plantilla
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="ht-input"
                placeholder="Nombre de la plantilla"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveCurrentAsTemplate()}
                autoFocus
              />
              <button onClick={saveCurrentAsTemplate} disabled={saving || !newName.trim()} className="ht-btn ht-btn-primary" style={{ flexShrink: 0, padding: '9px 12px' }}>
                {saving ? '...' : <Check size={16} />}
              </button>
              <button onClick={() => setShowSave(false)} className="ht-btn ht-btn-ghost" style={{ flexShrink: 0, padding: '9px 12px' }}>
                <X size={16} />
              </button>
            </div>
          )}
          {currentAssignments.length === 0 && (
            <p style={{ fontSize: 11, color: 'var(--ht-text-4)', marginTop: 6, textAlign: 'center' }}>
              Asigná tareas esta semana para poder guardarla como plantilla
            </p>
          )}
        </div>

        {/* Template list */}
        <div style={{ padding: 16, maxHeight: '55vh', overflowY: 'auto' }}>
          {loading && <div style={{ color: 'var(--ht-text-3)', fontSize: 14, textAlign: 'center', padding: 24 }}>Cargando...</div>}

          {!loading && templates.length === 0 && (
            <div className="ht-empty" style={{ padding: '24px 0' }}>
              <p style={{ fontWeight: 700, marginBottom: 4 }}>Sin plantillas</p>
              <p style={{ fontSize: 13 }}>Guardá la semana actual para reutilizarla</p>
            </div>
          )}

          {templates.map(t => {
            const slots = (t.preview_data as any)?.slots ?? []

            return (
              <div key={t.id} className="ht-card" style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 15 }}>{t.name}</p>
                    <p style={{ fontSize: 12, color: 'var(--ht-text-3)' }}>{t.description}</p>
                  </div>
                  <button onClick={() => deleteTemplate(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ht-text-4)', padding: 4 }}>
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Mini preview grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 3, marginBottom: 10 }}>
                  {ORDERED_DAYS.map(day => {
                    const daySlots = slots.filter((s: any) => s.day === day)
                    return (
                      <div key={day}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--ht-text-4)', textAlign: 'center', textTransform: 'uppercase', marginBottom: 3 }}>
                          {DAY_LABELS[day]}
                        </div>
                        {daySlots.map((s: any, i: number) => (
                          <div key={i} style={{
                            background: MEMBER_LIGHT[s.member_slot % 5],
                            borderRadius: 4, padding: '3px 4px', marginBottom: 2,
                            fontSize: 9, fontWeight: 600,
                            color: MEMBER_COLORS[s.member_slot % 5],
                            textAlign: 'center', lineHeight: 1.2,
                          }}>
                            {s.chore_name?.slice(0, 8)}{s.chore_name?.length > 8 ? '…' : ''}
                          </div>
                        ))}
                        {daySlots.length === 0 && (
                          <div style={{ height: 18, background: 'var(--ht-line-2)', borderRadius: 4 }} />
                        )}
                      </div>
                    )
                  })}
                </div>

                <button
                  onClick={() => applyTemplate(t)}
                  disabled={applying === t.id}
                  className="ht-btn ht-btn-primary"
                  style={{ width: '100%', fontSize: 13 }}
                >
                  {applying === t.id ? <div className="ht-spinner" style={{ borderTopColor: 'white' }} /> : null}
                  {applying === t.id ? 'Aplicando...' : 'Aplicar esta semana'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
