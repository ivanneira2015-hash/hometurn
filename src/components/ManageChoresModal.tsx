'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChoreDefinition, Household } from '@/lib/types'
import { X, Plus, Trash2 } from 'lucide-react'

const ICONS = ['🧹', '🧽', '🍽️', '🛒', '🧺', '🧴', '🪣', '🛋️', '🪟', '🚿', '🍳', '🥗', '🌿', '🐾', '📦', '🔧']
const CATEGORIES = ['limpieza', 'cocina', 'compras', 'orden', 'jardín', 'mantenimiento', 'otro']
const DIFFICULTIES: ChoreDefinition['difficulty'][] = ['light', 'medium', 'heavy']
const DIFFICULTY_LABELS = { light: '🟢 Liviana', medium: '🟡 Moderada', heavy: '🔴 Pesada' }

interface Props {
  household: Household
  chores: ChoreDefinition[]
  onClose: () => void
  onUpdate: (chores: ChoreDefinition[]) => void
}

export default function ManageChoresModal({ household, chores, onClose, onUpdate }: Props) {
  const supabase = createClient()
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('🧹')
  const [category, setCategory] = useState('limpieza')
  const [difficulty, setDifficulty] = useState<ChoreDefinition['difficulty']>('medium')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function addChore() {
    if (!name.trim()) return
    setSaving(true)
    const { data, error } = await supabase
      .from('chore_definitions')
      .insert({ household_id: household.id, name: name.trim(), icon, category, difficulty })
      .select()
      .single()

    if (!error && data) {
      onUpdate([...chores, data])
      setName('')
    }
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
        <div style={{ padding: '20px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>Gestionar Tareas</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ht-text-3)' }}>
            <X size={22} />
          </button>
        </div>

        {/* Add new chore */}
        <div style={{ padding: '0 16px 16px', borderBottom: '1px solid var(--ht-line)' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ht-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
            Nueva Tarea
          </p>

          {/* Icon selector */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {ICONS.map(ic => (
              <button
                key={ic}
                onClick={() => setIcon(ic)}
                style={{
                  width: 36, height: 36, borderRadius: 8, border: '2px solid',
                  borderColor: icon === ic ? 'var(--ht-purple)' : 'var(--ht-line)',
                  background: icon === ic ? 'var(--ht-purple-light)' : 'white',
                  fontSize: 18, cursor: 'pointer',
                }}
              >
                {ic}
              </button>
            ))}
          </div>

          <input
            className="ht-input"
            placeholder="Nombre de la tarea (ej: Barrer)"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addChore()}
            style={{ marginBottom: 8 }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <select className="ht-input" value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>)}
            </select>
            <select className="ht-input" value={difficulty} onChange={e => setDifficulty(e.target.value as ChoreDefinition['difficulty'])}>
              {DIFFICULTIES.map(d => <option key={d} value={d}>{DIFFICULTY_LABELS[d]}</option>)}
            </select>
          </div>

          <button
            onClick={addChore}
            disabled={saving || !name.trim()}
            className="ht-btn ht-btn-primary"
            style={{ width: '100%' }}
          >
            <Plus size={16} />
            {saving ? 'Guardando...' : 'Agregar Tarea'}
          </button>
        </div>

        {/* Existing chores */}
        <div style={{ padding: '16px', maxHeight: '50vh', overflowY: 'auto' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ht-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
            Tareas del hogar ({chores.length})
          </p>
          {chores.length === 0 && (
            <div className="ht-empty">
              <div style={{ fontSize: 36, marginBottom: 8 }}>🧹</div>
              <p>No hay tareas definidas aún</p>
            </div>
          )}
          {chores.map(chore => (
            <div key={chore.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 10,
              background: 'var(--ht-surface-2)', marginBottom: 6,
            }}>
              <span style={{ fontSize: 22 }}>{chore.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{chore.name}</div>
                <div style={{ fontSize: 11, color: 'var(--ht-text-3)', textTransform: 'capitalize' }}>
                  {chore.category} · {DIFFICULTY_LABELS[chore.difficulty]}
                </div>
              </div>
              <button
                onClick={() => deleteChore(chore.id)}
                disabled={deleting === chore.id}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ht-red)', padding: 6, borderRadius: 6 }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
