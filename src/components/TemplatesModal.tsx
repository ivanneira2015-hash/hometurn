'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ScheduleTemplate, HouseholdMember, WeeklyAssignment, ChoreDefinition } from '@/lib/types'
import { X, Plus, Trash2, Check, LayoutTemplate, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react'
import { ORDERED_DAYS, DAY_LABELS_FULL } from '@/lib/dates'
import { PRESET_TEMPLATES, PresetTemplate } from '@/lib/presetTemplates'

const MEMBER_COLORS = ['#4f46e5', '#10b981', '#f97316', '#3b82f6', '#f43f5e']
const MEMBER_GRAD = [
  'linear-gradient(135deg,#4f46e5,#818cf8)',
  'linear-gradient(135deg,#10b981,#34d399)',
  'linear-gradient(135deg,#f97316,#fbbf24)',
  'linear-gradient(135deg,#3b82f6,#60a5fa)',
  'linear-gradient(135deg,#f43f5e,#fb7185)',
]
const MEMBER_BG = [
  'rgba(79,70,229,0.08)', 'rgba(16,185,129,0.08)',
  'rgba(249,115,22,0.08)', 'rgba(59,130,246,0.08)', 'rgba(244,63,94,0.08)',
]
const MEMBER_BORDER = [
  'rgba(79,70,229,0.2)', 'rgba(16,185,129,0.2)',
  'rgba(249,115,22,0.2)', 'rgba(59,130,246,0.2)', 'rgba(244,63,94,0.2)',
]

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

// Visual weekly schedule preview — the main visual component
function TemplatePreview({
  slots,
  memberNames,
}: {
  slots: { day: string; chore_name: string; member_slot: number }[]
  memberNames: string[]
}) {
  return (
    <div style={{ overflowX: 'auto', marginBottom: 14 }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 4, minWidth: 320 }}>
        <thead>
          <tr>
            <th style={{ fontSize: 10, fontWeight: 700, color: 'var(--ht-text-4)', textAlign: 'left', padding: '4px 6px', width: 72 }}>
              Miembro
            </th>
            {ORDERED_DAYS.map(day => (
              <th key={day} style={{
                fontSize: 10, fontWeight: 700, color: 'var(--ht-primary)',
                textAlign: 'center', padding: '4px 2px',
                background: 'rgba(79,70,229,0.06)',
                borderRadius: 6,
              }}>
                {DAY_LABELS_FULL[day as keyof typeof DAY_LABELS_FULL].slice(0, 3).toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[0, 1, 2].map(mi => {
            const name = memberNames[mi] ?? `Miembro ${mi + 1}`
            return (
              <tr key={mi}>
                {/* Member label */}
                <td style={{ padding: '3px 6px 3px 0', verticalAlign: 'top' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 9999,
                      background: MEMBER_GRAD[mi % 5],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 800, color: 'white', flexShrink: 0,
                    }}>
                      {name[0]?.toUpperCase()}
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: MEMBER_COLORS[mi % 5], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 44 }}>
                      {name}
                    </span>
                  </div>
                </td>

                {/* Day cells */}
                {ORDERED_DAYS.map(day => {
                  const dayChores = slots.filter(s => s.day === day && s.member_slot === mi)
                  return (
                    <td key={day} style={{ verticalAlign: 'top', padding: 2 }}>
                      {dayChores.length === 0 ? (
                        <div style={{ height: 28, borderRadius: 6, background: 'rgba(0,0,0,0.03)' }} />
                      ) : (
                        dayChores.map((s, i) => (
                          <div key={i} style={{
                            background: MEMBER_BG[mi % 5],
                            border: `1px solid ${MEMBER_BORDER[mi % 5]}`,
                            borderRadius: 6, padding: '3px 4px',
                            marginBottom: i < dayChores.length - 1 ? 2 : 0,
                            fontSize: 9, fontWeight: 700,
                            color: MEMBER_COLORS[mi % 5],
                            textAlign: 'center', lineHeight: 1.3,
                          }}>
                            {s.chore_name.length > 10
                              ? s.chore_name.slice(0, 9) + '…'
                              : s.chore_name}
                          </div>
                        ))
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function TemplatesModal({ householdId, members, chores, currentAssignments, weekStart, onClose, onApplied }: Props) {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('preset')
  const [savedTemplates, setSavedTemplates] = useState<ScheduleTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [applying, setApplying] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [showSave, setShowSave] = useState(false)
  const [previewIdx, setPreviewIdx] = useState(0)

  // Member display names from actual household members
  const memberNames = [0, 1, 2].map(i => members[i]?.profile?.name?.split(' ')[0] ?? `Miembro ${i + 1}`)

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
    await supabase.from('weekly_assignments').delete().eq('household_id', householdId).eq('week_start', weekStart)
    const inserts = preset.slots
      .map(slot => {
        const chore = chores.find(c => c.name.toLowerCase() === slot.chore_name.toLowerCase())
        const member = members[slot.member_slot] ?? members[0]
        if (!chore) return null
        return { household_id: householdId, week_start: weekStart, profile_id: member.profile_id, chore_id: chore.id, day_of_week: slot.day, completed: false }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
    if (inserts.length === 0) { setApplying(null); return }
    const { data } = await supabase.from('weekly_assignments').insert(inserts).select('*, chore:chore_definitions(*), profile:profiles(*)')
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

  const currentPreset = PRESET_TEMPLATES[previewIdx]

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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, background: 'rgba(99,102,241,0.07)', padding: 4, borderRadius: 9999, marginBottom: 0 }}>
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
        <div style={{ padding: '16px', maxHeight: '70vh', overflowY: 'auto' }}>

          {/* ── PRESET TAB — visual carousel ── */}
          {tab === 'preset' && (
            <>
              {/* Navigation header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <button
                  onClick={() => setPreviewIdx(i => Math.max(0, i - 1))}
                  disabled={previewIdx === 0}
                  style={{ background: 'none', border: '1px solid var(--ht-glass-border)', borderRadius: 9999, padding: '6px 10px', cursor: previewIdx === 0 ? 'not-allowed' : 'pointer', opacity: previewIdx === 0 ? 0.3 : 1 }}
                >
                  <ChevronLeft size={16} color="var(--ht-primary)" />
                </button>

                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 22 }}>{currentPreset.icon}</span>
                    <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--ht-text)' }}>{currentPreset.name}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ht-primary)', background: 'var(--ht-primary-light)', padding: '2px 10px', borderRadius: 9999 }}>
                    {currentPreset.system}
                  </span>
                </div>

                <button
                  onClick={() => setPreviewIdx(i => Math.min(PRESET_TEMPLATES.length - 1, i + 1))}
                  disabled={previewIdx === PRESET_TEMPLATES.length - 1}
                  style={{ background: 'none', border: '1px solid var(--ht-glass-border)', borderRadius: 9999, padding: '6px 10px', cursor: previewIdx === PRESET_TEMPLATES.length - 1 ? 'not-allowed' : 'pointer', opacity: previewIdx === PRESET_TEMPLATES.length - 1 ? 0.3 : 1 }}
                >
                  <ChevronRight size={16} color="var(--ht-primary)" />
                </button>
              </div>

              {/* Dot indicators */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 14 }}>
                {PRESET_TEMPLATES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPreviewIdx(i)}
                    style={{
                      width: i === previewIdx ? 20 : 6,
                      height: 6, borderRadius: 9999, border: 'none', cursor: 'pointer',
                      background: i === previewIdx ? 'var(--ht-primary)' : 'rgba(99,102,241,0.2)',
                      transition: 'all 0.2s ease',
                      padding: 0,
                    }}
                  />
                ))}
              </div>

              {/* Description */}
              <p style={{ fontSize: 13, color: 'var(--ht-text-3)', marginBottom: 14, lineHeight: 1.6, textAlign: 'center' }}>
                {currentPreset.description}
              </p>

              {/* Visual preview card */}
              <div style={{
                background: 'var(--ht-glass)',
                backdropFilter: 'blur(16px)',
                border: '1px solid var(--ht-glass-border)',
                borderRadius: 20, padding: 14,
                marginBottom: 16,
                boxShadow: 'var(--ht-shadow-card)',
              }}>
                <TemplatePreview slots={currentPreset.slots} memberNames={memberNames} />

                {/* Member legend */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
                  {memberNames.slice(0, 3).map((name, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 9999, background: MEMBER_GRAD[i % 5] }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: MEMBER_COLORS[i % 5] }}>{name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
                {[
                  { label: 'Tareas totales', value: currentPreset.slots.length },
                  { label: 'Por semana', value: `${(currentPreset.slots.length / 3).toFixed(0)} c/u` },
                  { label: 'Sistema', value: currentPreset.system },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: 'rgba(99,102,241,0.06)', borderRadius: 14, padding: '10px 8px', textAlign: 'center' }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--ht-primary)' }}>{value}</p>
                    <p style={{ fontSize: 10, color: 'var(--ht-text-3)', marginTop: 2 }}>{label}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => applyPreset(currentPreset)}
                disabled={applying === currentPreset.name}
                className="ht-btn ht-btn-primary"
                style={{ width: '100%', fontSize: 14, padding: '13px' }}
              >
                {applying === currentPreset.name
                  ? <><div className="ht-spinner" /> Aplicando...</>
                  : <><Sparkles size={15} /> Aplicar "{currentPreset.name}" esta semana</>
                }
              </button>
            </>
          )}

          {/* ── SAVED TAB ── */}
          {tab === 'saved' && (
            <>
              <div style={{ marginBottom: 16 }}>
                {!showSave ? (
                  <button onClick={() => setShowSave(true)} disabled={currentAssignments.length === 0} className="ht-btn ht-btn-ghost" style={{ width: '100%', fontSize: 13 }}>
                    <Plus size={14} /> Guardar semana actual como plantilla
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
                  <p style={{ fontWeight: 700, marginBottom: 6, fontSize: 16 }}>Sin plantillas guardadas</p>
                  <p style={{ fontSize: 13 }}>Armá tu semana ideal y guardala acá para reutilizarla cada semana</p>
                </div>
              )}

              {savedTemplates.map(t => {
                const slots = (t.preview_data as any)?.slots ?? []
                return (
                  <div key={t.id} className="ht-card" style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div>
                        <p style={{ fontWeight: 800, fontSize: 15 }}>{t.name}</p>
                        <p style={{ fontSize: 12, color: 'var(--ht-text-3)' }}>{t.description}</p>
                      </div>
                      <button onClick={() => deleteTemplate(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ht-text-4)', padding: 6 }}>
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <TemplatePreview slots={slots} memberNames={memberNames} />

                    <button onClick={() => applySaved(t)} disabled={applying === t.id} className="ht-btn ht-btn-primary" style={{ width: '100%', fontSize: 13 }}>
                      {applying === t.id ? <><div className="ht-spinner" /> Aplicando...</> : 'Aplicar esta semana'}
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
