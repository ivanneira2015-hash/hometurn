'use client'

import { useAuth } from '@/contexts/AuthContext'
import { CalendarRange, Plus, GraduationCap, Gift, Clock, StickyNote } from 'lucide-react'

const EVENT_TYPES = [
  { icon: CalendarRange, label: 'Evento', color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
  { icon: Gift,          label: 'Cumpleaños', color: '#f43f5e', bg: 'rgba(244,63,94,0.1)' },
  { icon: GraduationCap, label: 'Examen', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  { icon: Clock,         label: 'Recordatorio', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { icon: StickyNote,    label: 'Nota', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
]

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function MiniCalendar() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const today = now.getDate()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="ht-card" style={{ padding: 16, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p style={{ fontWeight: 800, fontSize: 16 }}>{MONTHS[month]} {year}</p>
        <span className="ht-badge ht-badge-indigo">Hoy</span>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--ht-text-4)', padding: '4px 0' }}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {cells.map((day, i) => (
          <div key={i} style={{
            textAlign: 'center', padding: '6px 2px', borderRadius: 9999,
            fontSize: 13, fontWeight: day === today ? 800 : 500,
            background: day === today ? 'linear-gradient(135deg,#7c3aed,#f43f5e)' : 'transparent',
            color: day === today ? 'white' : day ? 'var(--ht-text)' : 'transparent',
            cursor: day ? 'pointer' : 'default',
          }}>
            {day ?? ''}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AgendaPage() {
  const { household } = useAuth()

  return (
    <div>
      <div className="ht-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9999,
              background: 'linear-gradient(135deg,#7c3aed,#f43f5e)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(124,58,237,0.35)',
            }}>
              <CalendarRange size={18} color="white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800 }}>Agenda</h1>
              <p style={{ fontSize: 12, color: 'var(--ht-text-3)', fontWeight: 500 }}>{household?.name}</p>
            </div>
          </div>
          <button className="ht-btn ht-btn-primary" style={{ padding: '7px 14px', fontSize: 13 }}>
            <Plus size={14} /> Evento
          </button>
        </div>
      </div>

      <div className="ht-page" style={{ paddingTop: 16 }}>

        {/* Mini calendar */}
        <MiniCalendar />

        {/* Event types */}
        <p className="ht-section-label">Tipos de evento</p>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
          {EVENT_TYPES.map(({ icon: Icon, label, color, bg }) => (
            <div key={label} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              padding: '12px 14px', borderRadius: 16, flexShrink: 0,
              background: 'var(--ht-glass-warm)', border: `1px solid ${color}20`,
              boxShadow: 'var(--ht-shadow-card)',
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 9999, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={15} color={color} strokeWidth={2} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ht-text-2)', whiteSpace: 'nowrap' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Próximos eventos — empty */}
        <p className="ht-section-label">Próximos eventos</p>
        <div className="ht-card" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 9999,
            background: 'linear-gradient(135deg,rgba(124,58,237,0.15),rgba(244,63,94,0.1))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <CalendarRange size={24} color="#7c3aed" strokeWidth={2} />
          </div>
          <p style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>Sin eventos próximos</p>
          <p style={{ fontSize: 13, color: 'var(--ht-text-3)', marginBottom: 20, lineHeight: 1.6 }}>
            Agregá cumpleaños, exámenes, recordatorios y eventos compartidos con el hogar
          </p>
          <button className="ht-btn ht-btn-primary" style={{ margin: '0 auto' }}>
            <Plus size={15} /> Agregar evento
          </button>
        </div>
      </div>
    </div>
  )
}
