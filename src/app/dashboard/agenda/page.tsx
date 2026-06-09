'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { CalendarEvent } from '@/lib/types'
import {
  CalendarRange, Plus, X, Check, Trash2,
  Lock, Globe, ChevronLeft, ChevronRight,
  GraduationCap, Gift, Clock, StickyNote, Star, Edit2,
  Sun, Calendar, CalendarDays
} from 'lucide-react'

const EVENT_TYPES = [
  { type: 'event'     as const, icon: CalendarRange, label: 'Evento',       color: '#7c3aed' },
  { type: 'birthday'  as const, icon: Gift,          label: 'Cumpleaños',   color: '#be185d' },
  { type: 'exam'      as const, icon: GraduationCap, label: 'Examen',       color: '#b45309' },
  { type: 'reminder'  as const, icon: Clock,         label: 'Recordatorio', color: '#047857' },
  { type: 'note'      as const, icon: StickyNote,    label: 'Nota',         color: '#4338ca' },
]

const DAYS_SHORT  = ['D','L','M','M','J','V','S']
const DAYS_FULL   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const MONTHS_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

type AgendaTab = 'hoy' | 'semana' | 'mes'

function getTypeConfig(type: CalendarEvent['type']) {
  return EVENT_TYPES.find(t => t.type === type) ?? EVENT_TYPES[0]
}

function AgendaInner() {
  const { user, profile, household } = useAuth()
  const supabase = createClient()
  const searchParams = useSearchParams()

  const now = new Date()
  const [agendaTab, setAgendaTab] = useState<AgendaTab>('hoy')
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate())
  const [weekOffset, setWeekOffset] = useState(0)  // 0 = current week
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null)

  // Form state
  const [fTitle,  setFTitle]  = useState('')
  const [fType,   setFType]   = useState<CalendarEvent['type']>('event')
  const [fDate,   setFDate]   = useState(new Date().toISOString().split('T')[0])
  const [fTime,   setFTime]   = useState('')
  const [fAllDay, setFAllDay] = useState(true)
  const [fRecur,  setFRecur]  = useState(false)
  const [fRule,   setFRule]   = useState<CalendarEvent['recurrence_rule']>('yearly')
  const [fDesc,   setFDesc]   = useState('')
  const [fVisib,  setFVisib]  = useState<'shared'|'private'>('shared')
  const [saving,  setSaving]  = useState(false)

  // PWA shortcut ?q=add
  useEffect(() => {
    if (searchParams.get('q') === 'add') setShowAdd(true)
  }, [searchParams])

  // Calendar grid
  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells       = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  const today       = now.getFullYear() === year && now.getMonth() === month ? now.getDate() : null

  // Week grid — 7 days starting from Monday of current week + weekOffset
  const getWeekDays = () => {
    const d = new Date(now)
    const dayOfWeek = d.getDay()
    const monday = new Date(d)
    monday.setDate(d.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + weekOffset * 7)
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(monday)
      day.setDate(monday.getDate() + i)
      return day
    })
  }
  const weekDays = getWeekDays()

  const loadEvents = useCallback(async () => {
    if (!household || !user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*, profile:profiles(name,avatar_url)')
      .eq('household_id', household.id)
      .or(`visibility.eq.shared,profile_id.eq.${user.id}`)
      .order('date').order('time', { ascending: true, nullsFirst: true })

    if (error) { console.error('Agenda:', error.message); setLoading(false); return }
    setEvents(data ?? [])
    setLoading(false)
  }, [household, user])

  useEffect(() => { loadEvents() }, [loadEvents])

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1)
    setSelectedDay(null)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1)
    setSelectedDay(null)
  }

  // Get events for a date string
  function eventsForDate(dateStr: string): CalendarEvent[] {
    const target = new Date(dateStr + 'T12:00:00')
    return events.filter(e => {
      if (e.date === dateStr) return true
      if (e.is_recurring) {
        const orig = new Date(e.date + 'T12:00:00')
        if (e.recurrence_rule === 'yearly')  return orig.getMonth() === target.getMonth() && orig.getDate() === target.getDate()
        if (e.recurrence_rule === 'monthly') return orig.getDate() === target.getDate()
        if (e.recurrence_rule === 'weekly')  return orig.getDay() === target.getDay()
      }
      return false
    })
  }

  function dateStr(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  }

  // Today's events
  const todayStr = dateStr(now)
  const todayEvents = eventsForDate(todayStr).sort((a,b) => (a.time??'25:00').localeCompare(b.time??'25:00'))

  // This week upcoming (next 7 days excluding today)
  const upcomingWeek = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now); d.setDate(now.getDate() + i + 1)
    return { date: d, str: dateStr(d), events: eventsForDate(dateStr(d)) }
  }).filter(x => x.events.length > 0)

  function openEdit(ev: CalendarEvent) {
    setEditEvent(ev)
    setFTitle(ev.title); setFType(ev.type); setFDate(ev.date)
    setFTime(ev.time?.slice(0,5) ?? ''); setFAllDay(ev.is_all_day)
    setFRecur(ev.is_recurring); setFRule(ev.recurrence_rule ?? 'yearly')
    setFDesc(ev.description ?? ''); setFVisib(ev.visibility)
    setShowAdd(true)
  }

  function openNew(dateStr?: string) {
    setEditEvent(null); setFTitle(''); setFDesc(''); setFTime('')
    setFAllDay(true); setFRecur(false); setFVisib('shared')
    setFDate(dateStr ?? new Date().toISOString().split('T')[0])
    setShowAdd(true)
  }

  async function saveEvent() {
    if (!fTitle.trim() || !household || !profile) return
    setSaving(true)
    const cfg = getTypeConfig(fType)
    const payload = {
      title: fTitle.trim(), type: fType, color: cfg.color,
      date: fDate, time: fAllDay ? null : fTime || null, is_all_day: fAllDay,
      is_recurring: fRecur, recurrence_rule: fRecur ? fRule : null,
      description: fDesc.trim() || null, visibility: fVisib,
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
    setShowAdd(false); setEditEvent(null); setFTitle(''); setFDesc(''); setFTime('')
    await loadEvents()
  }

  async function deleteEvent(id: string) {
    await supabase.from('calendar_events').delete().eq('id', id)
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  const selectedDayStr = selectedDay
    ? `${year}-${String(month+1).padStart(2,'0')}-${String(selectedDay).padStart(2,'0')}`
    : null
  const selectedEvents = selectedDayStr ? eventsForDate(selectedDayStr) : []

  return (
    <div>
      {/* Header */}
      <div className="ht-page-header">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:9999, background:'linear-gradient(135deg,#7c3aed,#be185d)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 3px 10px rgba(124,58,237,0.3)' }}>
              <CalendarRange size={16} color="white" strokeWidth={2.5} />
            </div>
            <h1 style={{ fontSize:20, fontWeight:800 }}>Agenda</h1>
          </div>
          <button onClick={() => openNew()} className="ht-btn ht-btn-primary" style={{ padding:'7px 14px', fontSize:13 }}>
            <Plus size={14} /> Evento
          </button>
        </div>

        {/* Tab selector */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, background:'rgba(124,58,237,0.06)', padding:4, borderRadius:9999 }}>
          {([['hoy', Sun, 'Hoy'], ['semana', CalendarDays, 'Semana'], ['mes', Calendar, 'Mes']] as const).map(([t, Icon, label]) => (
            <button key={t} onClick={() => setAgendaTab(t)} style={{ padding:'8px 4px', borderRadius:9999, border:'none', cursor:'pointer', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:4, background:agendaTab===t?'white':'transparent', color:agendaTab===t?'var(--ht-purple)':'var(--ht-text-3)', boxShadow:agendaTab===t?'0 2px 8px rgba(124,58,237,0.1)':'none', transition:'all 0.15s' }}>
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="ht-page" style={{ paddingTop:12 }}>

        {/* ══ HOY ══ */}
        {agendaTab === 'hoy' && (
          <>
            {/* Today hero */}
            <div className="ht-card" style={{ marginBottom:12, padding:'18px 16px', background:'linear-gradient(135deg,rgba(124,58,237,0.1),rgba(190,24,93,0.06))', border:'1px solid rgba(124,58,237,0.15)' }}>
              <p style={{ fontSize:12, fontWeight:700, color:'var(--ht-purple)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:4 }}>Hoy</p>
              <p style={{ fontSize:22, fontWeight:900, color:'var(--ht-text)', letterSpacing:'-0.02em' }}>
                {now.toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'long' })}
              </p>
            </div>

            {/* Birthday reminder — próximos 7 días */}
            {(() => {
              const upcomingBirthdays = events.filter(e => {
                if (e.type !== 'birthday' || !e.is_recurring) return false
                const orig = new Date(e.date + 'T12:00:00')
                for (let i = 0; i <= 7; i++) {
                  const d = new Date(now); d.setDate(now.getDate() + i)
                  if (orig.getMonth() === d.getMonth() && orig.getDate() === d.getDate()) return true
                }
                return false
              })
              if (upcomingBirthdays.length === 0) return null
              return (
                <div style={{ marginBottom: 14 }}>
                  {upcomingBirthdays.map(b => {
                    const orig = new Date(b.date + 'T12:00:00')
                    const isToday = orig.getMonth() === now.getMonth() && orig.getDate() === now.getDate()
                    const daysUntil = Array.from({ length: 8 }, (_, i) => {
                      const d = new Date(now); d.setDate(now.getDate() + i)
                      return orig.getMonth() === d.getMonth() && orig.getDate() === d.getDate() ? i : null
                    }).find(x => x !== null) ?? 0
                    return (
                      <div key={b.id} style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                        borderRadius: 16, marginBottom: 8,
                        background: isToday ? 'rgba(190,24,93,0.08)' : 'rgba(180,83,9,0.06)',
                        border: `1px solid ${isToday ? 'rgba(190,24,93,0.2)' : 'rgba(180,83,9,0.15)'}`,
                      }}>
                        <span style={{ fontSize: 28 }}>🎂</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 800, fontSize: 14, color: 'var(--ht-text)' }}>{b.title}</p>
                          <p style={{ fontSize: 12, color: isToday ? '#be185d' : '#b45309', fontWeight: 600 }}>
                            {isToday ? '¡Hoy es su cumpleaños!' : `En ${daysUntil} día${daysUntil > 1 ? 's' : ''}`}
                          </p>
                        </div>
                        {isToday && <span style={{ fontSize: 20 }}>🎉</span>}
                      </div>
                    )
                  })}
                </div>
              )
            })()}

            {/* Today's events */}
            <p className="ht-section-label">Eventos de hoy</p>
            {todayEvents.length === 0 ? (
              <div className="ht-card" style={{ textAlign:'center', padding:'20px 16px', marginBottom:16 }}>
                <Sun size={22} color="rgba(124,58,237,0.3)" style={{ margin:'0 auto 8px', display:'block' }} />
                <p style={{ fontSize:14, color:'var(--ht-text-3)', fontWeight:600 }}>Sin eventos hoy</p>
                <button onClick={() => openNew(todayStr)} className="ht-btn ht-btn-ghost" style={{ marginTop:10, fontSize:12 }}>
                  <Plus size={12} /> Agregar para hoy
                </button>
              </div>
            ) : (
              <div style={{ marginBottom:16 }}>
                {todayEvents.map(ev => <EventCard key={ev.id} event={ev} userId={user?.id} onDelete={deleteEvent} onEdit={openEdit} />)}
              </div>
            )}

            {/* This week */}
            {upcomingWeek.length > 0 && (
              <>
                <p className="ht-section-label">Esta semana</p>
                {upcomingWeek.map(({ date, events: dayEvs }) => (
                  <div key={dateStr(date)} style={{ marginBottom:12 }}>
                    <p style={{ fontSize:12, fontWeight:700, color:'var(--ht-purple)', marginBottom:6 }}>
                      {date.toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'short' })}
                    </p>
                    {dayEvs.map(ev => <EventCard key={ev.id} event={ev} userId={user?.id} onDelete={deleteEvent} onEdit={openEdit} />)}
                  </div>
                ))}
              </>
            )}

            {todayEvents.length === 0 && upcomingWeek.length === 0 && (
              <div className="ht-card" style={{ textAlign:'center', padding:'28px 16px' }}>
                <Star size={24} color="rgba(124,58,237,0.3)" style={{ margin:'0 auto 10px', display:'block' }} />
                <p style={{ fontWeight:700, fontSize:15, marginBottom:6 }}>Semana libre</p>
                <p style={{ fontSize:13, color:'var(--ht-text-3)', marginBottom:16 }}>No hay eventos próximos</p>
                <button onClick={() => openNew()} className="ht-btn ht-btn-primary"><Plus size={14} /> Agregar evento</button>
              </div>
            )}
          </>
        )}

        {/* ══ SEMANA ══ */}
        {agendaTab === 'semana' && (
          <>
            {/* Week navigation */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <button onClick={() => setWeekOffset(w => w - 1)} style={{ background:'rgba(124,58,237,0.08)', border:'none', borderRadius:9999, width:32, height:32, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <ChevronLeft size={16} color="var(--ht-purple)" />
              </button>
              <div style={{ textAlign:'center' }}>
                <p style={{ fontWeight:800, fontSize:14, color:'var(--ht-text)' }}>
                  {weekDays[0].getDate()} {MONTHS_SHORT[weekDays[0].getMonth()]} – {weekDays[6].getDate()} {MONTHS_SHORT[weekDays[6].getMonth()]}
                </p>
                {weekOffset === 0 && <p style={{ fontSize:11, color:'var(--ht-purple)', fontWeight:600 }}>Semana actual</p>}
              </div>
              <button onClick={() => setWeekOffset(w => w + 1)} style={{ background:'rgba(124,58,237,0.08)', border:'none', borderRadius:9999, width:32, height:32, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <ChevronRight size={16} color="var(--ht-purple)" />
              </button>
            </div>

            {/* 7-day grid */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:6, marginBottom:16 }}>
              {weekDays.map((day, i) => {
                const ds = dateStr(day)
                const dayEvs = eventsForDate(ds)
                const isToday = ds === todayStr
                return (
                  <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                    {/* Day header */}
                    <p style={{ fontSize:10, fontWeight:700, color:isToday?'var(--ht-purple)':'var(--ht-text-4)', textTransform:'uppercase' }}>
                      {DAYS_FULL[day.getDay()].slice(0,3)}
                    </p>
                    <div style={{
                      width:32, height:32, borderRadius:9999,
                      background:isToday?'var(--ht-grad)':'transparent',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:14, fontWeight:isToday?800:500,
                      color:isToday?'white':'var(--ht-text)',
                      cursor:'pointer',
                    }} onClick={() => { setSelectedDay(day.getDate()); setYear(day.getFullYear()); setMonth(day.getMonth()); setAgendaTab('mes') }}>
                      {day.getDate()}
                    </div>
                    {/* Event dots/chips */}
                    <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:3 }}>
                      {dayEvs.slice(0,3).map((ev, j) => {
                        const cfg = getTypeConfig(ev.type)
                        return (
                          <div key={j} onClick={() => openEdit(ev)} style={{
                            width:'100%', borderRadius:6, padding:'2px 4px',
                            background:`${cfg.color}15`, cursor:'pointer',
                            fontSize:9, fontWeight:700, color:cfg.color,
                            textAlign:'center', lineHeight:1.3,
                            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                          }}>
                            {ev.title.slice(0,8)}{ev.title.length>8?'…':''}
                          </div>
                        )
                      })}
                      {dayEvs.length > 3 && (
                        <p style={{ fontSize:8, color:'var(--ht-text-4)', textAlign:'center' }}>+{dayEvs.length-3}</p>
                      )}
                      {dayEvs.length === 0 && (
                        <button onClick={() => openNew(ds)} style={{ width:'100%', height:20, borderRadius:6, border:'1.5px dashed rgba(124,58,237,0.15)', background:'transparent', cursor:'pointer' }} />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Selected day detail in week view */}
            {weekOffset === 0 && todayEvents.length > 0 && (
              <>
                <p className="ht-section-label">Hoy — {now.toLocaleDateString('es-AR', { weekday:'long' })}</p>
                {todayEvents.map(ev => <EventCard key={ev.id} event={ev} userId={user?.id} onDelete={deleteEvent} onEdit={openEdit} />)}
              </>
            )}
          </>
        )}

        {/* ══ MES ══ */}
        {agendaTab === 'mes' && (
          <>
            {/* Month navigation */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <button onClick={prevMonth} style={{ background:'rgba(124,58,237,0.08)', border:'none', borderRadius:9999, width:32, height:32, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <ChevronLeft size={16} color="var(--ht-purple)" />
              </button>
              <span style={{ fontWeight:800, fontSize:15 }}>{MONTHS_FULL[month]} {year}</span>
              <button onClick={nextMonth} style={{ background:'rgba(124,58,237,0.08)', border:'none', borderRadius:9999, width:32, height:32, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <ChevronRight size={16} color="var(--ht-purple)" />
              </button>
            </div>

            <div className="ht-card" style={{ padding:'14px 12px', marginBottom:12 }}>
              {/* Day names */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:6 }}>
                {DAYS_SHORT.map((d, i) => (
                  <div key={i} style={{ textAlign:'center', fontSize:11, fontWeight:700, color:i===0||i===6?'var(--ht-rose)':'var(--ht-text-4)', padding:'4px 0' }}>{d}</div>
                ))}
              </div>
              {/* Day cells */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
                {cells.map((day, i) => {
                  if (!day) return <div key={i} />
                  const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                  const dayEvs = eventsForDate(ds)
                  const isToday = day === today
                  const isSelected = day === selectedDay
                  return (
                    <button key={i} onClick={() => setSelectedDay(day === selectedDay ? null : day)} style={{
                      display:'flex', flexDirection:'column', alignItems:'center', padding:'6px 2px',
                      borderRadius:10, border:'none', cursor:'pointer',
                      background:isSelected?'var(--ht-grad)':isToday?'rgba(124,58,237,0.1)':'transparent',
                      transition:'all 0.15s',
                    }}>
                      <span style={{ fontSize:13, fontWeight:isToday||isSelected?800:500, color:isSelected?'white':isToday?'var(--ht-purple)':'var(--ht-text)', lineHeight:1.4 }}>{day}</span>
                      {dayEvs.length > 0 && (
                        <div style={{ display:'flex', gap:2, marginTop:2, flexWrap:'wrap', justifyContent:'center' }}>
                          {dayEvs.slice(0,3).map((e,j) => <div key={j} style={{ width:5, height:5, borderRadius:9999, background:isSelected?'rgba(255,255,255,0.7)':e.color, flexShrink:0 }} />)}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Selected day events */}
            {selectedDay && (
              <div style={{ marginBottom:16 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                  <p className="ht-section-label" style={{ marginBottom:0 }}>
                    {selectedDay} de {MONTHS_FULL[month]}
                  </p>
                  <button onClick={() => openNew(selectedDayStr!)} style={{ background:'rgba(124,58,237,0.08)', border:'none', borderRadius:9999, padding:'5px 10px', cursor:'pointer', fontSize:12, fontWeight:700, color:'var(--ht-purple)', display:'flex', alignItems:'center', gap:4 }}>
                    <Plus size={12} /> Agregar
                  </button>
                </div>
                {selectedEvents.length === 0 ? (
                  <div className="ht-card" style={{ textAlign:'center', padding:'18px', color:'var(--ht-text-3)', fontSize:14 }}>Sin eventos</div>
                ) : selectedEvents.map(ev => (
                  <EventCard key={ev.id} event={ev} userId={user?.id} onDelete={deleteEvent} onEdit={openEdit} />
                ))}
              </div>
            )}

            {/* Upcoming (no day selected) */}
            {!selectedDay && (
              <>
                <p className="ht-section-label">Próximos 30 días</p>
                {events.filter(e => {
                  const d = new Date(e.date + 'T12:00:00')
                  const diff = (d.getTime() - now.getTime()) / (1000*60*60*24)
                  return diff >= 0 && diff <= 30
                }).sort((a,b) => a.date.localeCompare(b.date)).slice(0,8).map(ev => (
                  <EventCard key={ev.id} event={ev} userId={user?.id} onDelete={deleteEvent} onEdit={openEdit} showDate />
                ))}
                {events.filter(e => {
                  const d = new Date(e.date + 'T12:00:00')
                  return (d.getTime() - now.getTime()) / (1000*60*60*24) >= 0
                }).length === 0 && (
                  <div className="ht-card" style={{ textAlign:'center', padding:'28px 16px' }}>
                    <Star size={24} color="rgba(124,58,237,0.3)" style={{ margin:'0 auto 10px', display:'block' }} />
                    <p style={{ fontWeight:700, fontSize:15, marginBottom:6 }}>Sin eventos próximos</p>
                    <button onClick={() => openNew()} className="ht-btn ht-btn-primary"><Plus size={14} /> Agregar</button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* ══ MODAL NUEVO/EDITAR EVENTO ══ */}
      {showAdd && (
        <>
          <div className="ht-overlay" onClick={() => { setShowAdd(false); setEditEvent(null) }} />
          <div className="ht-modal">
            <div style={{ padding:'20px 16px 0' }}>
              <div style={{ width:36, height:4, background:'rgba(124,58,237,0.2)', borderRadius:9999, margin:'0 auto 16px' }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                <h2 style={{ fontSize:17, fontWeight:800 }}>{editEvent?'Editar evento':'Nuevo evento'}</h2>
                <button onClick={() => { setShowAdd(false); setEditEvent(null) }} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--ht-text-3)', padding:4 }}><X size={20} /></button>
              </div>
            </div>
            <div style={{ padding:'0 16px 32px' }}>
              {/* Tipo */}
              <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4, marginBottom:16 }}>
                {EVENT_TYPES.map(({ type, icon: Icon, label, color }) => (
                  <button key={type} onClick={() => setFType(type)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, padding:'10px 14px', borderRadius:14, flexShrink:0, border:'none', background:fType===type?color:'rgba(0,0,0,0.05)', cursor:'pointer', transition:'all 0.15s' }}>
                    <Icon size={18} color={fType===type?'white':color} strokeWidth={2} />
                    <span style={{ fontSize:10, fontWeight:700, color:fType===type?'white':'var(--ht-text-3)', whiteSpace:'nowrap' }}>{label}</span>
                  </button>
                ))}
              </div>
              <input className="ht-input" placeholder="Título" value={fTitle} onChange={e => setFTitle(e.target.value)} style={{ marginBottom:12 }} autoFocus />
              <div style={{ display:'grid', gridTemplateColumns:fAllDay?'1fr':'1fr 1fr', gap:8, marginBottom:12 }}>
                <input type="date" className="ht-input" value={fDate} onChange={e => setFDate(e.target.value)} />
                {!fAllDay && <input type="time" className="ht-input" value={fTime} onChange={e => setFTime(e.target.value)} />}
              </div>
              <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
                {[
                  { label:'Todo el día', active:fAllDay, onClick:()=>setFAllDay(!fAllDay) },
                  { label:'Se repite', active:fRecur, onClick:()=>setFRecur(!fRecur) },
                ].map(({ label, active, onClick }) => (
                  <button key={label} onClick={onClick} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:9999, border:'none', background:active?'var(--ht-purple)':'rgba(0,0,0,0.05)', color:active?'white':'var(--ht-text-3)', cursor:'pointer', fontSize:12, fontWeight:700, transition:'all 0.15s' }}>
                    {active && <Check size={12} strokeWidth={3} />} {label}
                  </button>
                ))}
              </div>
              {fRecur && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, marginBottom:12 }}>
                  {(['daily','weekly','monthly','yearly'] as const).map(r => (
                    <button key={r} onClick={() => setFRule(r)} style={{ padding:'7px 4px', borderRadius:9999, border:'none', background:fRule===r?'var(--ht-purple)':'rgba(0,0,0,0.05)', fontSize:10, fontWeight:700, cursor:'pointer', color:fRule===r?'white':'var(--ht-text-3)' }}>
                      {r==='daily'?'Diario':r==='weekly'?'Semanal':r==='monthly'?'Mensual':'Anual'}
                    </button>
                  ))}
                </div>
              )}
              <input className="ht-input" placeholder="Descripción (opcional)" value={fDesc} onChange={e => setFDesc(e.target.value)} style={{ marginBottom:12 }} />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:20 }}>
                {[{v:'shared' as const, emoji:'👥', label:'Compartido', desc:'Todos lo ven'},{v:'private' as const, emoji:'🔒', label:'Privado', desc:'Solo vos'}].map(({ v, emoji, label, desc }) => (
                  <button key={v} onClick={() => setFVisib(v)} style={{ padding:'10px', borderRadius:14, border:'none', background:fVisib===v?'var(--ht-purple)':'rgba(0,0,0,0.05)', cursor:'pointer', textAlign:'center', transition:'all 0.15s' }}>
                    <div style={{ fontSize:18, marginBottom:4 }}>{emoji}</div>
                    <p style={{ fontSize:12, fontWeight:700, color:fVisib===v?'white':'var(--ht-text)' }}>{label}</p>
                    <p style={{ fontSize:10, color:fVisib===v?'rgba(255,255,255,0.7)':'var(--ht-text-3)' }}>{desc}</p>
                  </button>
                ))}
              </div>
              <button onClick={saveEvent} disabled={saving||!fTitle.trim()} className="ht-btn ht-btn-primary" style={{ width:'100%', padding:'13px' }}>
                {saving ? <><div className="ht-spinner" /> Guardando...</> : <><Check size={16} /> {editEvent?'Guardar cambios':'Guardar evento'}</>}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function EventCard({ event, userId, onDelete, onEdit, showDate }: {
  event: CalendarEvent; userId?: string
  onDelete: (id: string) => void; onEdit?: (ev: CalendarEvent) => void; showDate?: boolean
}) {
  const cfg = getTypeConfig(event.type)
  const Icon = cfg.icon
  const dateLabel = showDate
    ? new Date(event.date + 'T12:00:00').toLocaleDateString('es-AR', { weekday:'short', day:'numeric', month:'short' })
    : null

  return (
    <div className="ht-list-item" style={{ marginBottom:8, alignItems:'flex-start' }}>
      <div style={{ width:36, height:36, borderRadius:9999, flexShrink:0, background:`${event.color}12`, border:`1.5px solid ${event.color}25`, display:'flex', alignItems:'center', justifyContent:'center', marginTop:2 }}>
        <Icon size={16} color={event.color} strokeWidth={2} />
      </div>
      <div style={{ flex:1 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <p style={{ fontWeight:700, fontSize:14, color:'var(--ht-text)' }}>{event.title}</p>
          {event.is_recurring && <span style={{ fontSize:9, fontWeight:800, color:event.color, background:`${event.color}12`, padding:'1px 5px', borderRadius:9999 }}>↺</span>}
          {event.visibility==='private' && <Lock size={10} color="var(--ht-text-4)" />}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:2, flexWrap:'wrap' }}>
          {showDate && <span style={{ fontSize:11, fontWeight:600, color:event.color }}>{dateLabel}</span>}
          {!event.is_all_day && event.time && <span style={{ fontSize:11, color:'var(--ht-text-3)' }}>{event.time.slice(0,5)}</span>}
          {event.description && <span style={{ fontSize:11, color:'var(--ht-text-3)' }}>{event.description}</span>}
          <span style={{ fontSize:10, fontWeight:700, color:cfg.color, background:`${cfg.color}10`, padding:'1px 6px', borderRadius:9999 }}>{cfg.label}</span>
        </div>
      </div>
      {event.profile_id === userId && (
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          <button onClick={() => onEdit?.(event)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--ht-purple)', padding:'2px 4px' }}><Edit2 size={13} /></button>
          <button onClick={() => onDelete(event.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--ht-text-4)', padding:'2px 4px' }}><Trash2 size={13} /></button>
        </div>
      )}
    </div>
  )
}

export default function AgendaPage() {
  return (
    <Suspense fallback={<div className="ht-page" style={{ paddingTop:60, textAlign:'center' }}><div className="ht-spinner ht-spinner-dark" style={{ margin:'0 auto' }} /></div>}>
      <AgendaInner />
    </Suspense>
  )
}
