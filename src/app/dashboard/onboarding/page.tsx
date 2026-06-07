'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Home, Users, ArrowRight } from 'lucide-react'

export default function OnboardingPage() {
  const { user, refreshHousehold } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [householdName, setHouseholdName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function createHousehold() {
    if (!householdName.trim() || !user) return
    setLoading(true)
    setError('')

    const { data: hh, error: errHH } = await supabase
      .from('households')
      .insert({ name: householdName.trim() })
      .select()
      .single()

    if (errHH || !hh) {
      setError(`Error al crear el hogar: ${errHH?.message ?? 'sin respuesta'}`)
      setLoading(false)
      return
    }

    const { error: errMember } = await supabase
      .from('household_members')
      .insert({ household_id: hh.id, profile_id: user.id, role: 'admin' })

    if (errMember) {
      setError(`Error al unirse al hogar: ${errMember.message}`)
      setLoading(false)
      return
    }

    window.location.href = '/dashboard'
  }

  async function joinHousehold() {
    if (!inviteCode.trim() || !user) return
    setLoading(true)
    setError('')

    const { data: hh, error: errHH } = await supabase
      .from('households')
      .select('id')
      .eq('invite_code', inviteCode.trim().toUpperCase())
      .single()

    if (errHH || !hh) {
      setError('Código no válido')
      setLoading(false)
      return
    }

    const { error: errMember } = await supabase
      .from('household_members')
      .insert({ household_id: hh.id, profile_id: user.id, role: 'member' })

    if (errMember) {
      setError(`Error: ${errMember.message}`)
      setLoading(false)
      return
    }

    window.location.href = '/dashboard'
  }

  return (
    <div style={{
      minHeight: '100dvh', background: '#fafafa',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, background: '#6366f1',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Home size={28} color="white" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 6 }}>
            Configurar hogar
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280' }}>
            Creá un hogar nuevo o unite a uno existente con el código de invitación
          </p>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
          background: '#f3f4f6', padding: 4, borderRadius: 10, marginBottom: 24,
        }}>
          {(['create', 'join'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 600,
              background: tab === t ? '#fff' : 'transparent',
              color: tab === t ? '#111827' : '#6b7280',
              boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}>
              {t === 'create' ? 'Crear hogar' : 'Unirse'}
            </button>
          ))}
        </div>

        {tab === 'create' ? (
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              Nombre del hogar
            </label>
            <input
              className="ht-input"
              placeholder="Ej: Casa de los García"
              value={householdName}
              onChange={e => setHouseholdName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createHousehold()}
              autoFocus
              style={{ marginBottom: error ? 8 : 16 }}
            />
            {error && <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 12 }}>{error}</p>}
            <button
              onClick={createHousehold}
              disabled={loading || !householdName.trim()}
              className="ht-btn ht-btn-primary"
              style={{ width: '100%' }}
            >
              {loading ? <div className="ht-spinner" style={{ borderTopColor: 'white' }} /> : <ArrowRight size={16} />}
              {loading ? 'Creando...' : 'Crear hogar'}
            </button>
          </div>
        ) : (
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              Código de invitación
            </label>
            <input
              className="ht-input"
              placeholder="ABC123"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && joinHousehold()}
              style={{ marginBottom: error ? 6 : 16, letterSpacing: '0.12em', fontWeight: 700, textAlign: 'center' }}
              autoFocus
              maxLength={6}
            />
            {error && <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 12 }}>{error}</p>}
            <button
              onClick={joinHousehold}
              disabled={loading || inviteCode.length < 4}
              className="ht-btn ht-btn-primary"
              style={{ width: '100%' }}
            >
              {loading ? <div className="ht-spinner" style={{ borderTopColor: 'white' }} /> : <Users size={16} />}
              {loading ? 'Uniéndose...' : 'Unirse al hogar'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
