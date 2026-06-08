'use client'

import { useAuth } from '@/contexts/AuthContext'
import { TrendingUp, Plus, ArrowUpCircle, ArrowDownCircle, PieChart, FileSpreadsheet } from 'lucide-react'

export default function FinancesPage() {
  const { household } = useAuth()

  const FEATURES = [
    { icon: ArrowDownCircle, label: 'Registrar gasto', color: '#f43f5e', bg: 'rgba(244,63,94,0.1)', soon: false },
    { icon: ArrowUpCircle, label: 'Registrar ingreso', color: '#10b981', bg: 'rgba(16,185,129,0.1)', soon: false },
    { icon: PieChart, label: 'Ver gráficos', color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', soon: true },
    { icon: FileSpreadsheet, label: 'Importar Excel', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', soon: true },
  ]

  return (
    <div>
      <div className="ht-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9999,
            background: 'linear-gradient(135deg,#10b981,#34d399)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(16,185,129,0.35)',
          }}>
            <TrendingUp size={18} color="white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800 }}>Finanzas</h1>
            <p style={{ fontSize: 12, color: 'var(--ht-text-3)', fontWeight: 500 }}>{household?.name}</p>
          </div>
        </div>
      </div>

      <div className="ht-page" style={{ paddingTop: 16 }}>

        {/* Resumen del mes — placeholder */}
        <div style={{
          background: 'linear-gradient(135deg,rgba(16,185,129,0.15),rgba(124,58,237,0.1))',
          border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: 24, padding: 20, marginBottom: 12,
        }}>
          <p className="ht-section-label" style={{ marginBottom: 12 }}>Resumen — Junio 2026</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Ingresos', value: '$0', color: '#10b981', icon: ArrowUpCircle },
              { label: 'Gastos', value: '$0', color: '#f43f5e', icon: ArrowDownCircle },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(8px)', borderRadius: 16, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Icon size={14} color={color} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ht-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                </div>
                <p style={{ fontSize: 22, fontWeight: 900, color, letterSpacing: '-0.02em' }}>{value}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.5)', borderRadius: 12 }}>
            <p style={{ fontSize: 12, color: 'var(--ht-text-3)', textAlign: 'center' }}>
              Agregá movimientos para ver el resumen del mes
            </p>
          </div>
        </div>

        {/* Acciones rápidas */}
        <p className="ht-section-label">Acciones rápidas</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {FEATURES.map(({ icon: Icon, label, color, bg, soon }) => (
            <button key={label} style={{
              padding: '18px 14px',
              background: soon ? 'rgba(255,255,255,0.4)' : 'var(--ht-glass-warm)',
              backdropFilter: 'blur(12px)',
              border: `1px solid ${soon ? 'var(--ht-glass-border)' : color + '25'}`,
              borderRadius: 20, cursor: soon ? 'default' : 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8,
              textAlign: 'left', opacity: soon ? 0.6 : 1,
              boxShadow: soon ? 'none' : 'var(--ht-shadow-card)',
              transition: 'all 0.15s',
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 9999, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} color={color} strokeWidth={2} />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--ht-text)' }}>{label}</p>
                {soon && <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--ht-text-4)', marginTop: 2 }}>Próximamente</p>}
              </div>
            </button>
          ))}
        </div>

        {/* Últimos movimientos — empty */}
        <p className="ht-section-label">Últimos movimientos</p>
        <div className="ht-card" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 9999,
            background: 'linear-gradient(135deg,rgba(16,185,129,0.15),rgba(124,58,237,0.1))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <TrendingUp size={24} color="#10b981" strokeWidth={2} />
          </div>
          <p style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>Sin movimientos aún</p>
          <p style={{ fontSize: 13, color: 'var(--ht-text-3)', marginBottom: 20, lineHeight: 1.6 }}>
            Registrá tu primer gasto o ingreso para empezar a controlar las finanzas del hogar
          </p>
          <button className="ht-btn ht-btn-primary" style={{ margin: '0 auto' }}>
            <Plus size={15} /> Agregar movimiento
          </button>
        </div>
      </div>
    </div>
  )
}
