'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { CalendarEvent } from '@/lib/types'
import {
  CalendarRange, Plus, X, Check, Trash2,
  Lock, Globe, ChevronLeft, ChevronRight,
  GraduationCap, Gift, Clock, StickyNote, Star, Edit2
} from 'lucide-react'

// ── Event type config ──────────────────────────────────────
const EVENT_TYPES = [
  { type: 'event'     as const, icon: CalendarRange, label: 'Evento',       color: '#7c3aed' },
  { type: 'birthday'  as const, icon: Gift,          label: 'Cumpleaños',   color: '#f43f5e' },
  { type: 'exam'      as const, icon: GraduationCap, label: 'Examen',       color: '#f59e0b' },
  { type: 'reminder'  as const, icon: Clock,         label: 'Recordatorio', color: '#10b981' },
  { type: 'note'      as const, icon: StickyNote,    label: 'Nota',         color: '#3b82f6' },
]

const DAYS_SHORT   = ['D','L','M','M','J','V','S']
const MONTHS_FULL  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function getTypeConfig(type: CalendarEvent['type']) {
  return EVENT_TYPES.find(t => t.type === type) ?? EVENT_TYPES[0]
}

function EventIcon({ type, size = 16 }: { type: CalendarEvent['type']; size?: number }) {
  const cfg = getTypeConfig(type)
  const Icon = cfg.icon
  return <Icon size={size} color={cfg.color} strokeWidth={2} />
}

export default function AgendaPage() {
  const { user, profile, household } = useAuth()
  const supabase = createClient()

  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  // Form state
  const [fTitle,    setFTitle]    = useState('')
  const [fType,     setFType]     = useState<CalendarEvent['type']>('event')
  const [fDate,     setFDate]     = useState(new Date().toISOString().split('T')[0])
  const [fTime,     setFTime]     = useState('')
  const [fAllDay,   setFAllDay]   = useState(true)
  const [fRecur,    setFRecur]    = useState(false)
  const [fRule,     setFRule]     = useState<CalendarEvent['recurrence_rule']>('yearly')
  const [fDesc,     setFDesc]     = useState('')
  const [fVisib,    setFVisib]    = useState<'shared'|'private'>('shared')
  const [saving,    setSaving]    = useState(false)
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null)

  function openEdit(ev: CalendarEvent) {
    setEditEvent(ev)
    setFTitle(ev.title)
    setFType(ev.type)
    setFDate(ev.date)
    setFTime(ev.time?.slice(0,5) ?? '')
    setFAllDay(ev.is_all_day)
    setFRecur(ev.is_recurring)
    setFRule(ev.recurrence_rule ?? 'yearly')
    setFDesc(ev.description ?? '')
    setFVisib(ev.visibility)
    setShowAdd(true)
  }

  // Calendar grid
  const firstDay     = new Date(year, month, 1).getDay()
  const daysInMonth  = new Date(year, month + 1, 0).getDate()
  const cells        = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  const today        = now.getFullYear() === year && now.getMonth() === month ? now.getDate() : null

  const loadEvents = useCallback(async () => {
    if (!household) return
    setLoading(true)
    const startDate = `${year}-${String(month + 1).padStart(2,'0')}-01`
    const endDate   = new Date(year, month + 1, 0).toISOString().split('T')[0]

    // Simplified query — fetch all household events matching visibility, filter dates in JS
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*, profile:profiles(name,avatar_url)')
      .eq('household_id', household.id)
      .or(`visibility.eq.shared,profile_id.eq.${user!.id}`)
      .order('date').order('time', { ascending: true, nullsFirst: true })

    if (error) {
      console.error('Agenda error:', error.message)
      setLoading(false)
      return
    }

    // Filter in JS: show events for this month OR recurring events
    const filtered = (data ?? []).filter(e => {
      if (e.is_recurring) return true
      return e.date >= startDate && e.date <= endDate
    })

    setEvents(filtered)
    setLoading(false)
  }, [household, year, month])

  useEffect(() => { loadEvents() }, [loadEvents])

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1)
    setSelectedDay(null)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1)
    setSelectedDay(null)
  }

  // Get events for a given day (handles yearly recurrence for birthdays etc.)
  function eventsForDay(day: number): CalendarEvent[] {
    const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    return events.filter(e => {
      if (e.date === dateStr) return true
      if (e.is_recurring && e.recurrence_rule === 'yearly') {
        const orig = new Date(e.date + 'T12:00:00')
        return orig.getMonth() === month && orig.getDate() === day
      }
      if (e.is_recurring && e.recurrence_rule === 'monthly') {
        const orig = new Date(e.date + 'T12:00:00')
        return orig.getDate() === day
      }
      return false
    })
  }

  async function saveEvent() {
    if (!fTitle.trim() || !household || !profile) return
    setSaving(true)
    const cfg = getTypeConfig(fType)
    const payload = {
      title: fTitle.trim(),
      type: fType,
      color: cfg.color,
      date: fDate,
      time: fAllDay ? null : fTime || null,
      is_all_day: fAllDay,
      is_recurring: fRecur,
      recurrence_rule: fRecur ? fRule : null,
      description: fDesc.trim() || null,
      visibility: fVisib,
    }
    let error: string | null = null
    if (editEvent) {
      const { error: e } = await supabase.from('calendar_events').update(payload).eq('id', editEvent.id)
      if (e) error = e.message
    } else {
      const { error: e } = await supabase.from('calendar_events').insert({ ...payload, household_id: household.id, profile_id: profile.id })
      if (e) error = e.message
    }
    setSaving(false)
    if (error) { alert(`Error: ${error}`); return }
    setShowAdd(false)
    setEditEvent(null)
    setFTitle(''); setFDesc(''); setFTime('')
    await loadEvents()
  }

  async function deleteEvent(id: string) {
    await supabase.from('calendar_events').delete().eq('id', id)
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  const selectedEvents = selectedDay ? eventsForDay(selectedDay) : []

  // Upcoming events (next 30 days from today)
  const upcoming = events
    .filter(e => {
      const d = new Date(e.date + 'T12:00:00')
      const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      return diff >= 0 && diff <= 30
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 10)

  return (
    <div>
      {/* ── Header ── */}
      <div className="ht-page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9999, background: 'linear-gradient(135deg,#7c3aed,#f43f5e)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(124,58,237,0.35)' }}>
              <CalendarRange size={16} color="white" strokeWidth={2.5} />
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 800 }}>Agenda</h1>
          </div>
          <button onClick={() => { setFDate(selectedDay ? `${year}-${String(month+1).padStart(2,'0')}-${String(selectedDay).padStart(2,'0')}` : new Date().toISOString().split('T')[0]); setShowAdd(true) }} className="ht-btn ht-btn-primary" style={{ padding: '7px 14px', fontSize: 13 }}>
            <Plus size={14} /> Evento
          </button>
        </div>

        {/* Month navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={prevMonth} style={{ background: 'rgba(124,58,237,0.08)', border: 'none', borderRadius: 9999, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={16} color="var(--ht-purple)" />
          </button>
          <span style={{ fontWeight: 800, fontSize: 16 }}>{MONTHS_FULL[month]} {year}</span>
          <button onClick={nextMonth} style={{ background: 'rgba(124,58,237,0.08)', border: 'none', borderRadius: 9999, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronRight size={16} color="var(--ht-purple)" />
          </button>
        </div>
      </div>

      <div className="ht-page" style={{ paddingTop: 12 }}>

        {/* ── Calendar grid ── */}
        <div className="ht-card" style={{ padding: '14px 12px', marginBottom: 12 }}>
          {/* Day names */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 6 }}>
            {DAYS_SHORT.map((d, i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: i === 0 || i === 6 ? 'var(--ht-rose)' : 'var(--ht-text-4)', padding: '4px 0' }}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={i} />
              const dayEvents = eventsForDay(day)
              const isToday    = day === today
              const isSelected = day === selectedDay
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: '6px 2px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: isSelected
                      ? 'var(--ht-grad)'
                      : isToday
                        ? 'rgba(124,58,237,0.1)'
                        : 'transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{
                    fontSize: 13, fontWeight: isToday || isSelected ? 800 : 500,
                    color: isSelected ? 'white' : isToday ? 'var(--ht-purple)' : 'var(--ht-text)',
                    lineHeight: 1.4,
                  }}>{day}</span>
                  {/* Event dots */}
                  {dayEvents.length > 0 && (
                    <div style={{ display: 'flex', gap: 2, marginTop: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {dayEvents.slice(0, 3).map((e, j) => (
                        <div key={j} style={{ width: 5, height: 5, borderRadius: 9999, background: isSelected ? 'rgba(255,255,255,0.7)' : e.color, flexShrink: 0 }} />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Selected day events ── */}
        {selectedDay && (
          <div style={{ marginBottom: 16 }}>
            <p className="ht-section-label">
              {selectedDay} de {MONTHS_FULL[month]}
              {selectedEvents.length > 0 ? ` · ${selectedEvents.length} evento${selectedEvents.length > 1 ? 's' : ''}` : ''}
            </p>
            {selectedEvents.length === 0 ? (
              <div className="ht-card" style={{ textAlign: 'center', padding: '20px' }}>
                <p style={{ fontSize: 14, color: 'var(--ht-text-3)', fontWeight: 600 }}>Sin eventos este día</p>
                <button onClick={() => { setFDate(`${year}-${String(month+1).padStart(2,'0')}-${String(selectedDay).padStart(2,'0')}`); setShowAdd(true) }} className="ht-btn ht-btn-ghost" style={{ marginTop: 10, fontSize: 13 }}>
                  <Plus size={13} /> Agregar evento
                </button>
              </div>
            ) : selectedEvents.map(ev => (
              <EventCard key={ev.id} event={ev} userId={user?.id} onDelete={deleteEvent} onEdit={openEdit} />
            ))}
          </div>
        )}

        {/* ── Upcoming (only when no day selected) ── */}
        {!selectedDay && (
          <>
            <p className="ht-section-label">Próximos 30 días</p>
            {upcoming.length === 0 ? (
              <div className="ht-card" style={{ textAlign: 'center', padding: '28px 16px' }}>
                <Star size={24} color="rgba(124,58,237,0.3)" style={{ margin: '0 auto 10px', display: 'block' }} />
                <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Sin eventos próximos</p>
                <p style={{ fontSize: 13, color: 'var(--ht-text-3)', marginBottom: 16 }}>Tocá un día del calendario para agregar</p>
                <button onClick={() => setShowAdd(true)} className="ht-btn ht-btn-primary"><Plus size={14} /> Agregar evento</button>
              </div>
            ) : upcoming.map(ev => (
              <EventCard key={ev.id} event={ev} userId={user?.id} onDelete={deleteEvent} showDate />
            ))}
          </>
        )}
      </div>

      {/* ══ MODAL AGREGAR EVENTO ══ */}
      {showAdd && (
        <>
          <div className="ht-overlay" onClick={() => setShowAdd(false)} />
          <div className="ht-modal">
            <div style={{ padding: '20px 16px 0' }}>
              <div style={{ width: 36, height: 4, background: 'rgba(124,58,237,0.2)', borderRadius: 9999, margin: '0 auto 16px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 17, fontWeight: 800 }}>{editEvent ? 'Editar evento' : 'Nuevo evento'}</h2>
                <button onClick={() => { setShowAdd(false); setEditEvent(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ht-text-3)', padding: 4 }}><X size={20} /></button>
              </div>
            </div>

            <div style={{ padding: '0 16px 32px' }}>
              {/* Tipo */}
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
                {EVENT_TYPES.map(({ type, icon: Icon, label, color }) => (
                  <button key={type} onClick={() => setFType(type)} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                    padding: '10px 14px', borderRadius: 14, flexShrink: 0, border: '1.5px solid',
                    borderColor: fType === type ? color : 'var(--ht-glass-border)',
                    background: fType === type ? `${color}12` : 'var(--ht-glass-warm)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                    <Icon size={18} color={fType === type ? color : 'var(--ht-text-4)'} strokeWidth={2} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: fType === type ? color : 'var(--ht-text-3)', whiteSpace: 'nowrap' }}>{label}</span>
                  </button>
                ))}
              </div>

              {/* Título */}
              <input className="ht-input" placeholder="Título del evento" value={fTitle} onChange={e => setFTitle(e.target.value)} style={{ marginBottom: 12 }} autoFocus />

              {/* Fecha */}
              <div style={{ display: 'grid', gridTemplateColumns: fAllDay ? '1fr' : '1fr 1fr', gap: 8, marginBottom: 12 }}>
                <input type="date" className="ht-input" value={fDate} onChange={e => setFDate(e.target.value)} />
                {!fAllDay && <input type="time" className="ht-input" value={fTime} onChange={e => setFTime(e.target.value)} />}
              </div>

              {/* Todo el día toggle */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <button onClick={() => setFAllDay(!fAllDay)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                  borderRadius: 9999, border: '1.5px solid',
                  borderColor: fAllDay ? 'var(--ht-purple)' : 'var(--ht-glass-border)',
                  background: fAllDay ? 'var(--ht-purple-light)' : 'var(--ht-glass-warm)',
                  cursor: 'pointer', fontSize: 13, fontWeight: 700,
                  color: fAllDay ? 'var(--ht-purple)' : 'var(--ht-text-3)',
                }}>
                  {fAllDay && <Check size={13} strokeWidth={3} />}
                  Todo el día
                </button>

                {/* Repetir */}
                <button onClick={() => setFRecur(!fRecur)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                  borderRadius: 9999, border: '1.5px solid',
                  borderColor: fRecur ? 'var(--ht-rose)' : 'var(--ht-glass-border)',
                  background: fRecur ? 'var(--ht-rose-light)' : 'var(--ht-glass-warm)',
                  cursor: 'pointer', fontSize: 13, fontWeight: 700,
                  color: fRecur ? 'var(--ht-rose)' : 'var(--ht-text-3)',
                }}>
                  {fRecur && <Check size={13} strokeWidth={3} />}
                  Se repite
                </button>
              </div>

              {/* Recurrence rule */}
              {fRecur && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 12 }}>
                  {(['daily','weekly','monthly','yearly'] as const).map(r => (
                    <button key={r} onClick={() => setFRule(r)} style={{
                      padding: '7px 4px', borderRadius: 9999, border: '1.5px solid',
                      borderColor: fRule === r ? 'var(--ht-rose)' : 'var(--ht-glass-border)',
                      background: fRule === r ? 'var(--ht-rose-light)' : 'var(--ht-glass-warm)',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      color: fRule === r ? 'var(--ht-rose)' : 'var(--ht-text-3)',
                    }}>
                      {r === 'daily' ? 'Diario' : r === 'weekly' ? 'Semanal' : r === 'monthly' ? 'Mensual' : 'Anual'}
                    </button>
                  ))}
                </div>
              )}

              {/* Descripción */}
              <input className="ht-input" placeholder="Descripción (opcional)" value={fDesc} onChange={e => setFDesc(e.target.value)} style={{ marginBottom: 12 }} />

              {/* Visibilidad */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
                {([['shared', Globe, 'Compartido', 'Todos lo ven', 'var(--ht-mint)'],['private', Lock, 'Privado', 'Solo vos', 'var(--ht-purple)']] as const).map(([v, Icon, label, desc, color]) => (
                  <button key={v} onClick={() => setFVisib(v)} style={{ padding: '10px', borderRadius: 14, border: '1.5px solid', borderColor: fVisib === v ? color : 'var(--ht-glass-border)', background: fVisib === v ? `${color}12` : 'var(--ht-glass-warm)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                    <Icon size={14} color={fVisib === v ? color : 'var(--ht-text-4)'} style={{ marginBottom: 4 }} />
                    <p style={{ fontSize: 12, fontWeight: 700, color: fVisib === v ? color : 'var(--ht-text)' }}>{label}</p>
                    <p style={{ fontSize: 10, color: 'var(--ht-text-3)' }}>{desc}</p>
                  </button>
                ))}
              </div>

              <button onClick={saveEvent} disabled={saving || !fTitle.trim()} className="ht-btn ht-btn-primary" style={{ width: '100%', padding: '13px' }}>
                {saving ? <><div className="ht-spinner" /> Guardando...</> : <><Check size={16} /> Guardar evento</>}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── EventCard component ──────────────────────────────────
function EventCard({ event, userId, onDelete, onEdit, showDate }: {
  event: CalendarEvent
  userId?: string
  onDelete: (id: string) => void
  onEdit?: (ev: CalendarEvent) => void
  showDate?: boolean
}) {
  const cfg = getTypeConfig(event.type)
  const Icon = cfg.icon
  const dateLabel = showDate
    ? new Date(event.date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
    : null

  return (
    <div className="ht-list-item" style={{ marginBottom: 8, alignItems: 'flex-start' }}>
      <div style={{
        width: 38, height: 38, borderRadius: 9999, flexShrink: 0,
        background: `${event.color}15`,
        border: `1.5px solid ${event.color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: 2,
      }}>
        <Icon size={17} color={event.color} strokeWidth={2} />
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--ht-text)' }}>{event.title}</p>
          {event.is_recurring && <span style={{ fontSize: 9, fontWeight: 800, color: event.color, background: `${event.color}15`, padding: '1px 6px', borderRadius: 9999 }}>↺</span>}
          {event.visibility === 'private' && <Lock size={11} color="var(--ht-text-4)" />}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
          {showDate && <span style={{ fontSize: 12, fontWeight: 600, color: event.color }}>{dateLabel}</span>}
          {!event.is_all_day && event.time && <span style={{ fontSize: 12, color: 'var(--ht-text-3)' }}>{event.time.slice(0,5)}</span>}
          {event.description && <span style={{ fontSize: 12, color: 'var(--ht-text-3)' }}>{event.description}</span>}
          <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, background: `${cfg.color}12`, padding: '1px 7px', borderRadius: 9999 }}>{cfg.label}</span>
        </div>
      </div>

      {event.profile_id === userId && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button onClick={() => onEdit?.(event)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ht-purple)', padding: '2px 4px' }}>
            <Edit2 size={13} />
          </button>
          <button onClick={() => onDelete(event.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ht-text-4)', padding: '2px 4px' }}>
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  )
}
