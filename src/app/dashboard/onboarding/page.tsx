'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Home, Users } from 'lucide-react'
import SuccessAnimation from '@/components/SuccessAnimation'

export default function OnboardingPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [householdName, setHouseholdName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ type: 'created' | 'joined'; name: string } | null>(null)

  async function ensureProfile() {
    if (!user) return
    const displayName = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Usuario'
    await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email ?? `${user.id}@unknown.com`,
      nombre: displayName,
      name: displayName,
      avatar_url: user.user_metadata?.avatar_url ?? null,
      color: '#C8956C',
    }, { onConflict: 'id', ignoreDuplicates: true })
  }

  async function createHousehold() {
    if (!householdName.trim() || !user) return
    setLoading(true)
    setError('')

    await ensureProfile()

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

    // Mostrar animación antes de redirigir
    setSuccess({ type: 'created', name: hh.name })
  }

  async function joinHousehold() {
    if (!inviteCode.trim() || !user) return
    setLoading(true)
    setError('')

    await ensureProfile()

    const { data: hh, error: errHH } = await supabase
      .from('households')
      .select('id, name')
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

    // Mostrar animación antes de redirigir
    setSuccess({ type: 'joined', name: hh.name })
  }

  // Mostrar animación de éxito
  if (success) {
    return (
      <SuccessAnimation
        type={success.type}
        householdName={success.name}
        onDone={() => { window.location.href = '/dashboard' }}
      />
    )
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 24,
      position: 'relative',
    }}>
      {/* Blobs */}
      <div style={{ position: 'absolute', top: '5%', left: '5%', width: 160, height: 160, borderRadius: '50%', background: 'rgba(167,139,250,0.3)', filter: 'blur(48px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '5%', width: 200, height: 200, borderRadius: '50%', background: 'rgba(251,207,232,0.35)', filter: 'blur(56px)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 360, position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 9999,
            background: 'linear-gradient(135deg,#4f46e5,#a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(79,70,229,0.35)',
          }}>
            <Home size={26} color="white" strokeWidth={2.2} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--ht-text)', letterSpacing: '-0.02em', marginBottom: 6 }}>
            Configurar hogar
          </h1>
          <p style={{ fontSize: 14, color: 'var(--ht-text-3)', fontWeight: 500 }}>
            Creá un hogar nuevo o unite con el código de invitación
          </p>
        </div>

        {/* Glass card */}
        <div style={{
          background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.55)', borderRadius: 28, padding: '24px',
          boxShadow: '0 8px 32px rgba(99,102,241,0.1)',
        }}>
          {/* Tabs */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
            background: 'rgba(99,102,241,0.07)', padding: 4, borderRadius: 9999, marginBottom: 24,
          }}>
            {(['create', 'join'] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setError('') }} style={{
                padding: '9px 12px', borderRadius: 9999, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 700,
                background: tab === t ? 'white' : 'transparent',
                color: tab === t ? 'var(--ht-primary)' : 'var(--ht-text-3)',
                boxShadow: tab === t ? '0 2px 8px rgba(99,102,241,0.12)' : 'none',
                transition: 'all 0.15s',
              }}>
                {t === 'create' ? '🏠 Crear hogar' : '🔑 Unirse'}
              </button>
            ))}
          </div>

          {tab === 'create' ? (
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ht-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
                Nombre del hogar
              </label>
              <input
                className="ht-input"
                placeholder="Ej: Casa García, Depto Centro..."
                value={householdName}
                onChange={e => setHouseholdName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createHousehold()}
                autoFocus
                style={{ marginBottom: error ? 8 : 20 }}
              />
              {error && <p style={{ fontSize: 13, color: 'var(--ht-rose)', marginBottom: 14, fontWeight: 500 }}>{error}</p>}
              <button
                onClick={createHousehold}
                disabled={loading || !householdName.trim()}
                className="ht-btn ht-btn-primary"
                style={{ width: '100%', padding: '13px' }}
              >
                {loading
                  ? <><div className="ht-spinner" /> Creando...</>
                  : <><Home size={16} /> Crear hogar</>
                }
              </button>
            </div>
          ) : (
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ht-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
                Código de invitación
              </label>
              <input
                className="ht-input"
                placeholder="ABC123"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && joinHousehold()}
                style={{ marginBottom: error ? 8 : 20, letterSpacing: '0.18em', fontWeight: 900, textAlign: 'center', fontSize: 18 }}
                autoFocus
                maxLength={6}
              />
              {error && <p style={{ fontSize: 13, color: 'var(--ht-rose)', marginBottom: 14, fontWeight: 500 }}>{error}</p>}
              <button
                onClick={joinHousehold}
                disabled={loading || inviteCode.length < 4}
                className="ht-btn ht-btn-primary"
                style={{ width: '100%', padding: '13px' }}
              >
                {loading
                  ? <><div className="ht-spinner" /> Uniéndose...</>
                  : <><Users size={16} /> Unirse al hogar</>
                }
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
