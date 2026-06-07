'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChoreDefinition, Profile, WeeklyAssignment } from '@/lib/types'
import { DAY_LABELS_FULL } from '@/lib/dates'
import { X, Check } from 'lucide-react'

interface Props {
  day: string
  member: Profile
  chores: ChoreDefinition[]
  weekStart: string
  householdId: string
  onClose: () => void
  onAssigned: (a: WeeklyAssignment) => void
}

const DIFF_LABELS = { light: 'Liviana', medium: 'Moderada', heavy: 'Pesada' }
const DIFF_COLORS = { light: 'var(--ht-green)', medium: 'var(--ht-yellow)', heavy: 'var(--ht-red)' }

export default function AssignChoreModal({ day, member, chores, weekStart, householdId, onClose, onAssigned }: Props) {
  const supabase = createClient()
  const [selected, setSelected] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const available = chores

  async function assign() {
    if (!selected) return
    setSaving(true)
    const { data } = await supabase.from('weekly_assignments')
      .insert({ household_id: householdId, week_start: weekStart, profile_id: member.id, chore_id: selected, day_of_week: day, completed: false })
      .select('*, chore:chore_definitions(*), profile:profiles(*)').single()
    if (data) onAssigned(data as WeeklyAssignment)
    setSaving(false)
  }

  return (
    <>
      <div className="ht-overlay" onClick={onClose} />
      <div className="ht-modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 16px 12px', borderBottom: '1px solid var(--ht-line)' }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 800 }}>Asignar tarea</h2>
            <p style={{ fontSize: 13, color: 'var(--ht-text-3)', marginTop: 2 }}>
              {member.name.split(' ')[0]} · {DAY_LABELS_FULL[day as keyof typeof DAY_LABELS_FULL]}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ht-text-3)', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '12px 16px 24px', maxHeight: '55vh', overflowY: 'auto' }}>
          {available.length === 0 ? (
            <div className="ht-empty" style={{ padding: '24px 0' }}>
              <p style={{ fontSize: 14 }}>No hay tareas. Agregá una en Gestionar Tareas.</p>
            </div>
          ) : available.map(chore => (
            <button
              key={chore.id}
              onClick={() => setSelected(chore.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px', borderRadius: 10, marginBottom: 6, border: '1.5px solid',
                borderColor: selected === chore.id ? 'var(--ht-indigo)' : 'var(--ht-line)',
                background: selected === chore.id ? 'var(--ht-indigo-light)' : 'var(--ht-surface)',
                cursor: 'pointer', transition: 'all 0.1s', textAlign: 'left',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                background: selected === chore.id ? 'var(--ht-indigo)' : 'var(--ht-surface-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {selected === chore.id
                  ? <Check size={16} color="white" strokeWidth={2.5} />
                  : <span style={{ width: 8, height: 8, borderRadius: '50%', background: DIFF_COLORS[chore.difficulty], display: 'block' }} />
                }
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: 15, color: selected === chore.id ? 'var(--ht-indigo)' : 'var(--ht-text)' }}>
                  {chore.name}
                </p>
                <p style={{ fontSize: 12, color: 'var(--ht-text-3)', textTransform: 'capitalize' }}>
                  {chore.category} · {DIFF_LABELS[chore.difficulty]}
                </p>
              </div>
            </button>
          ))}
        </div>

        <div style={{ padding: '0 16px 24px', display: 'flex', gap: 8 }}>
          <button onClick={onClose} className="ht-btn ht-btn-ghost" style={{ flex: 1 }}>Cancelar</button>
          <button onClick={assign} disabled={!selected || saving} className="ht-btn ht-btn-primary" style={{ flex: 2 }}>
            {saving ? <div className="ht-spinner" style={{ borderTopColor: 'white' }} /> : null}
            {saving ? 'Asignando...' : 'Asignar tarea'}
          </button>
        </div>
      </div>
    </>
  )
}
