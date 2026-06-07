'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChoreDefinition, Profile, WeeklyAssignment } from '@/lib/types'
import { DAY_LABELS_FULL, isRestrictedDay } from '@/lib/dates'
import { X, AlertTriangle } from 'lucide-react'

interface Props {
  day: string
  member: Profile
  chores: ChoreDefinition[]
  weekStart: string
  householdId: string
  onClose: () => void
  onAssigned: (assignment: WeeklyAssignment) => void
}

export default function AssignChoreModal({ day, member, chores, weekStart, householdId, onClose, onAssigned }: Props) {
  const supabase = createClient()
  const [selected, setSelected] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const restricted = isRestrictedDay(day as 'tuesday' | 'thursday')
  const availableChores = restricted
    ? chores.filter(c => c.difficulty === 'light')
    : chores

  async function assign() {
    if (!selected) return
    setSaving(true)
    const { data, error } = await supabase
      .from('weekly_assignments')
      .insert({
        household_id: householdId,
        week_start: weekStart,
        profile_id: member.id,
        chore_id: selected,
        day_of_week: day,
        completed: false,
      })
      .select('*, chore:chore_definitions(*), profile:profiles(*)')
      .single()

    if (!error && data) onAssigned(data as WeeklyAssignment)
    setSaving(false)
  }

  return (
    <>
      <div className="ht-overlay" onClick={onClose} />
      <div className="ht-modal">
        <div style={{ padding: '20px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800 }}>Asignar Tarea</h2>
            <p style={{ fontSize: 13, color: 'var(--ht-text-3)' }}>
              {member.name.split(' ')[0]} — {DAY_LABELS_FULL[day as keyof typeof DAY_LABELS_FULL]}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ht-text-3)' }}>
            <X size={22} />
          </button>
        </div>

        {restricted && (
          <div style={{
            margin: '0 16px 12px', padding: '10px 12px', borderRadius: 10,
            background: 'var(--ht-orange-light)', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <AlertTriangle size={16} color="var(--ht-orange)" />
            <span style={{ fontSize: 13, color: 'var(--ht-orange)', fontWeight: 600 }}>
              Día restringido — solo tareas livianas
            </span>
          </div>
        )}

        <div style={{ padding: '0 16px 24px', maxHeight: '60vh', overflowY: 'auto' }}>
          {availableChores.length === 0 && (
            <div className="ht-empty">
              <p style={{ fontSize: 14 }}>
                {restricted
                  ? 'No hay tareas livianas disponibles. Agregá una en "Gestionar Tareas".'
                  : 'No hay tareas disponibles. Agregá una en "Gestionar Tareas".'}
              </p>
            </div>
          )}
          {availableChores.map(chore => (
            <button
              key={chore.id}
              onClick={() => setSelected(chore.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 12, marginBottom: 8,
                border: '2px solid',
                borderColor: selected === chore.id ? 'var(--ht-purple)' : 'var(--ht-line)',
                background: selected === chore.id ? 'var(--ht-purple-light)' : 'var(--ht-surface)',
                cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 24 }}>{chore.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: selected === chore.id ? 'var(--ht-purple)' : 'var(--ht-text)' }}>
                  {chore.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ht-text-3)', textTransform: 'capitalize' }}>
                  {chore.category} · {chore.difficulty === 'light' ? '🟢 Liviana' : chore.difficulty === 'medium' ? '🟡 Moderada' : '🔴 Pesada'}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div style={{ padding: '0 16px 24px', display: 'flex', gap: 8 }}>
          <button onClick={onClose} className="ht-btn ht-btn-ghost" style={{ flex: 1 }}>
            Cancelar
          </button>
          <button
            onClick={assign}
            disabled={!selected || saving}
            className="ht-btn ht-btn-primary"
            style={{ flex: 2 }}
          >
            {saving ? 'Asignando...' : 'Asignar Tarea'}
          </button>
        </div>
      </div>
    </>
  )
}
