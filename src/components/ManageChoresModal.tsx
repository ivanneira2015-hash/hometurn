'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChoreDefinition, Household } from '@/lib/types'
import { X, Plus, Trash2 } from 'lucide-react'

const CATEGORIES = ['limpieza','cocina','compras','orden','jardín','mantenimiento','otro']
const DIFFICULTIES: { value: ChoreDefinition['difficulty']; label: string }[] = [
  { value: 'light', label: 'Liviana' },
  { value: 'medium', label: 'Moderada' },
  { value: 'heavy', label: 'Pesada' },
]
const DIFF_COLORS = { light: 'var(--ht-green)', medium: 'var(--ht-yellow)', heavy: 'var(--ht-red)' }

interface Props {
  household: Household
  chores: ChoreDefinition[]
  onClose: () => void
  onUpdate: (chores: ChoreDefinition[]) => void
}

export default function ManageChoresModal({ household, chores, onClose, onUpdate }: Props) {
  const supabase = createClient()
  const [name, setName] = useState('')
  const [category, setCategory] = useState('limpieza')
  const [difficulty, setDifficulty] = useState<ChoreDefinition['difficulty']>('medium')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function addChore() {
    if (!name.trim()) return
    setSaving(true)
    const { data } = await supabase.from('chore_definitions')
      .insert({ household_id: household.id, name: name.trim(), icon: '•', category, difficulty })
      .select().single()
    if (data) { onUpdate([...chores, data]); setName('') }
    setSaving(false)
  }

  async function deleteChore(id: string) {
    setDeleting(id)
    await supabase.from('chore_definitions').delete().eq('id', id)
    onUpdate(chores.filter(c => c.id !== id))
    setDeleting(null)
  }

  return (
    <>
      <div className="ht-overlay" onClick={onClose} />
      <div className="ht-modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 16px 16px', borderBottom: '1px solid var(--ht-line)' }}>
          <h2 style={{ fontSize: 17, fontWeight: 800 }}>Gestionar Tareas</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ht-text-3)', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Add form */}
        <div style={{ padding: '16px', borderBottom: '1px solid var(--ht-line)' }}>
          <p className="ht-section-label">Nueva tarea</p>
          <input
            className="ht-input"
            placeholder="Nombre (ej: Barrer)"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addChore()}
            style={{ marginBottom: 8 }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <select className="ht-input" value={category} onChange={e => setCategory(e.target.value)} style={{ cursor: 'pointer' }}>
              {CATEGORIES.map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>)}
            </select>
            <select className="ht-input" value={difficulty} onChange={e => setDifficulty(e.target.value as ChoreDefinition['difficulty'])} style={{ cursor: 'pointer' }}>
              {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <button onClick={addChore} disabled={saving || !name.trim()} className="ht-btn ht-btn-primary" style={{ width: '100%' }}>
            <Plus size={15} /> {saving ? 'Guardando...' : 'Agregar tarea'}
          </button>
        </div>

        {/* List */}
        <div style={{ padding: 16, maxHeight: '45vh', overflowY: 'auto' }}>
          <p className="ht-section-label">Tareas del hogar ({chores.length})</p>
          {chores.length === 0 ? (
            <div className="ht-empty" style={{ padding: '24px 0' }}>
              <p style={{ fontSize: 14 }}>No hay tareas definidas aún</p>
            </div>
          ) : chores.map(chore => (
            <div key={chore.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 10,
              background: 'var(--ht-surface-2)', marginBottom: 6,
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                background: DIFF_COLORS[chore.difficulty],
              }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: 14 }}>{chore.name}</p>
                <p style={{ fontSize: 11, color: 'var(--ht-text-3)', textTransform: 'capitalize' }}>
                  {chore.category} · {DIFFICULTIES.find(d => d.value === chore.difficulty)?.label}
                </p>
              </div>
              <button
                onClick={() => deleteChore(chore.id)}
                disabled={deleting === chore.id}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ht-text-4)', padding: 6, borderRadius: 6 }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
