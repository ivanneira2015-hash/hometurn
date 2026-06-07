'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ScheduleTemplate, HouseholdMember, WeeklyAssignment, ChoreDefinition } from '@/lib/types'
import { X, Plus, Trash2, Check, LayoutTemplate, Sparkles } from 'lucide-react'
import { ORDERED_DAYS, DAY_LABELS } from '@/lib/dates'
import { PRESET_TEMPLATES, PresetTemplate } from '@/lib/presetTemplates'

const MEMBER_COLORS = ['#4f46e5','#10b981','#f97316','#3b82f6','#f43f5e']
const MEMBER_LIGHT  = ['rgba(79,70,229,0.1)','rgba(16,185,129,0.1)','rgba(249,115,22,0.1)','rgba(59,130,246,0.1)','rgba(244,63,94,0.1)']

interface Props {
  householdId: string
  members: HouseholdMember[]
  chores: ChoreDefinition[]
  currentAssignments: WeeklyAssignment[]
  weekStart: string
  onClose: () => void
  onApplied: (assignments: WeeklyAssignment[]) => void
}

type Tab = 'preset' | 'saved'

export default function TemplatesModal({ householdId, members, chores, currentAssignments, weekStart, onClose, onApplied }: Props) {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('preset')
  const [savedTemplates, setSavedTemplates] = useState<ScheduleTemplate[]>([])
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
    setSavedTemplates(data ?? [])
    setLoading(false)
  }

  async function saveCurrentAsTemplate() {
    if (!newName.trim() || currentAssignments.length === 0) return
    setSaving(true)
    const slots = currentAssignments.map(a => {
      const memberIdx = members.findIndex(m => m.profile_id === a.profile_id)
      const chore = chores.find(c => c.id === a.chore_id)
      return { day: a.day_of_week, chore_name: chore?.name ?? '', member_slot: memberIdx, chore_id: a.chore_id, profile_id: a.profile_id }
    })
    const { data } = await supabase.from('schedule_templates').insert({
      household_id: householdId, name: newName.trim(),
      description: `${currentAssignments.length} tareas`, preview_data: { slots },
    }).select().single()
    if (data) { setSavedTemplates(prev => [data, ...prev]); setNewName(''); setShowSave(false) }
    setSaving(false)
  }

  async function applyPreset(preset: PresetTemplate) {
    setApplying(preset.name)

    // Delete current week
    await supabase.from('weekly_assignments')
      .delete().eq('household_id', householdId).eq('week_start', weekStart)

    // Map preset slots to real chore_ids and profile_ids
    const inserts = preset.slots
      .map(slot => {
        const chore = chores.find(c => c.name.toLowerCase() === slot.chore_name.toLowerCase())
        const member = members[slot.member_slot] ?? members[0]
        if (!chore) return null
        return { household_id: householdId, week_start: weekStart, profile_id: member.profile_id, chore_id: chore.id, day_of_week: slot.day, completed: false }
      })
      .filter(Boolean)

    if (inserts.length === 0) { setApplying(null); return }

    const { data } = await supabase.from('weekly_assignments')
      .insert(inserts)
      .select('*, chore:chore_definitions(*), profile:profiles(*)')

    if (data) onApplied(data as WeeklyAssignment[])
    setApplying(null)
  }

  async function applySaved(template: ScheduleTemplate) {
    setApplying(template.id)
    const slots = (template.preview_data as any)?.slots ?? []
    await supabase.from('weekly_assignments').delete().eq('household_id', householdId).eq('week_start', weekStart)
    const inserts = slots.map((slot: any) => {
      const member = members[slot.member_slot] ?? members[0]
      return { household_id: householdId, week_start: weekStart, profile_id: member.profile_id, chore_id: slot.chore_id, day_of_week: slot.day, completed: false }
    })
    const { data } = await supabase.from('weekly_assignments').insert(inserts).select('*, chore:chore_definitions(*), profile:profiles(*)')
    if (data) onApplied(data as WeeklyAssignment[])
    setApplying(null)
  }

  async function deleteTemplate(id: string) {
    await supabase.from('schedule_templates').delete().eq('id', id)
    setSavedTemplates(prev => prev.filter(t => t.id !== id))
  }

  const MiniGrid = ({ slots }: { slots: { day: string; chore_name: string; member_slot: number }[] }) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 3, marginBottom: 12 }}>
      {ORDERED_DAYS.map(day => {
        const daySlots = slots.filter(s => s.day === day)
        return (
          <div key={day}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--ht-text-4)', textAlign: 'center', textTransform: 'uppercase', marginBottom: 3 }}>
              {DAY_LABELS[day]}
            </div>
            {daySlots.slice(0, 4).map((s, i) => (
              <div key={i} style={{
                background: MEMBER_LIGHT[s.member_slot % 5],
                borderRadius: 4, padding: '2px 3px', marginBottom: 2,
                fontSize: 8, fontWeight: 700,
                color: MEMBER_COLORS[s.member_slot % 5],
                textAlign: 'center', lineHeight: 1.2,
                border: `1px solid ${MEMBER_COLORS[s.member_slot % 5]}25`,
              }}>
                {s.chore_name?.slice(0, 7)}{s.chore_name?.length > 7 ? '…' : ''}
              </div>
            ))}
            {daySlots.length === 0 && <div style={{ height: 16, background: 'rgba(99,102,241,0.05)', borderRadius: 4 }} />}
          </div>
        )
      })}
    </div>
  )

  return (
    <>
      <div className="ht-overlay" onClick={onClose} />
      <div className="ht-modal">
        {/* Header */}
        <div style={{ padding: '20px 16px 0' }}>
          <div style={{ width: 36, height: 4, background: 'rgba(99,102,241,0.2)', borderRadius: 9999, margin: '0 auto 16px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <LayoutTemplate size={18} color="var(--ht-primary)" />
              <h2 style={{ fontSize: 17, fontWeight: 800 }}>Plantillas</h2>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ht-text-3)', padding: 4 }}>
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, background: 'rgba(99,102,241,0.07)', padding: 4, borderRadius: 9999, marginBottom: 16 }}>
            {([['preset', '✨ Prediseñadas'], ['saved', '📁 Guardadas']] as const).map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '8px', borderRadius: 9999, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 700,
                background: tab === t ? 'white' : 'transparent',
                color: tab === t ? 'var(--ht-primary)' : 'var(--ht-text-3)',
                boxShadow: tab === t ? '0 2px 8px rgba(99,102,241,0.12)' : 'none',
                transition: 'all 0.15s',
              }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '0 16px 32px', maxHeight: '60vh', overflowY: 'auto' }}>

          {/* PRESET TAB */}
          {tab === 'preset' && (
            <>
              <p style={{ fontSize: 12, color: 'var(--ht-text-3)', marginBottom: 14, fontWeight: 500 }}>
                6 sistemas de organización diseñados para 3 convivientes. Se adaptan a las tareas que ya tenés cargadas.
              </p>
              {PRESET_TEMPLATES.map(preset => (
                <div key={preset.name} className="ht-card" style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 18 }}>{preset.icon}</span>
                        <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--ht-text)' }}>{preset.name}</span>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ht-primary)', background: 'var(--ht-primary-light)', padding: '2px 8px', borderRadius: 9999 }}>
                        {preset.system}
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--ht-text-3)', marginBottom: 10, lineHeight: 1.5 }}>{preset.description}</p>

                  <MiniGrid slots={preset.slots} />

                  <button
                    onClick={() => applyPreset(preset)}
                    disabled={applying === preset.name}
                    className="ht-btn ht-btn-primary"
                    style={{ width: '100%', fontSize: 13 }}
                  >
                    {applying === preset.name ? <div className="ht-spinner" /> : <Sparkles size={14} />}
                    {applying === preset.name ? 'Aplicando...' : 'Aplicar esta semana'}
                  </button>
                </div>
              ))}
            </>
          )}

          {/* SAVED TAB */}
          {tab === 'saved' && (
            <>
              {/* Save current */}
              <div style={{ marginBottom: 16 }}>
                {!showSave ? (
                  <button onClick={() => setShowSave(true)} disabled={currentAssignments.length === 0} className="ht-btn ht-btn-ghost" style={{ width: '100%', fontSize: 13 }}>
                    <Plus size={14} /> Guardar semana actual
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="ht-input" placeholder="Nombre de la plantilla" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveCurrentAsTemplate()} autoFocus />
                    <button onClick={saveCurrentAsTemplate} disabled={saving || !newName.trim()} className="ht-btn ht-btn-primary" style={{ flexShrink: 0, padding: '9px 14px' }}>
                      {saving ? '...' : <Check size={15} />}
                    </button>
                    <button onClick={() => setShowSave(false)} className="ht-btn ht-btn-ghost" style={{ flexShrink: 0, padding: '9px 14px' }}>
                      <X size={15} />
                    </button>
                  </div>
                )}
                {currentAssignments.length === 0 && !showSave && (
                  <p style={{ fontSize: 11, color: 'var(--ht-text-4)', marginTop: 6, textAlign: 'center' }}>
                    Asigná tareas esta semana para poder guardarla
                  </p>
                )}
              </div>

              {loading && <div style={{ textAlign: 'center', padding: 24, color: 'var(--ht-text-3)', fontSize: 14 }}>Cargando...</div>}
              {!loading && savedTemplates.length === 0 && (
                <div className="ht-empty" style={{ padding: '24px 0' }}>
                  <p style={{ fontWeight: 700, marginBottom: 4 }}>Sin plantillas guardadas</p>
                  <p style={{ fontSize: 13 }}>Armá tu semana y guardala para reutilizarla</p>
                </div>
              )}
              {savedTemplates.map(t => {
                const slots = (t.preview_data as any)?.slots ?? []
                return (
                  <div key={t.id} className="ht-card" style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 15 }}>{t.name}</p>
                        <p style={{ fontSize: 12, color: 'var(--ht-text-3)' }}>{t.description}</p>
                      </div>
                      <button onClick={() => deleteTemplate(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ht-text-4)', padding: 6 }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <MiniGrid slots={slots} />
                    <button onClick={() => applySaved(t)} disabled={applying === t.id} className="ht-btn ht-btn-primary" style={{ width: '100%', fontSize: 13 }}>
                      {applying === t.id ? <div className="ht-spinner" /> : null}
                      {applying === t.id ? 'Aplicando...' : 'Aplicar esta semana'}
                    </button>
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>
    </>
  )
}
