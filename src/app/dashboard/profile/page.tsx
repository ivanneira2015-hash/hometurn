'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Copy, LogOut, Users, Check, Share2, X, Home, UserMinus, DoorOpen, AlertTriangle } from 'lucide-react'
import { MEMBER_GRAD } from '@/lib/colors'

type ConfirmAction =
  | { type: 'leave' }
  | { type: 'remove'; memberId: string; memberName: string }

export default function ProfilePage() {
  const { user, profile, household, members, loading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [copied, setCopied] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newHouseholdName, setNewHouseholdName] = useState('')
  const [creating, setCreating] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [loading, user])

  const myMembership = members.find(m => m.profile_id === user?.id)
  const isAdmin = myMembership?.role === 'admin'

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  async function shareCode() {
    if (!household?.invite_code) return
    const text = `Únete a "${household.name}" en HomeTurn con el código: ${household.invite_code}\n🏠 hometurn.vercel.app`
    if (navigator.share) {
      try { await navigator.share({ title: 'HomeTurn — Código de invitación', text }); return }
      catch { /* cancelled */ }
    }
    await navigator.clipboard.writeText(household.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  async function joinHousehold() {
    if (!inviteCode.trim()) return
    setJoining(true); setJoinError('')
    const { data: hh } = await supabase.from('households').select('id')
      .eq('invite_code', inviteCode.trim().toUpperCase()).single()
    if (!hh) { setJoinError('Código no válido'); setJoining(false); return }
    const { error } = await supabase.from('household_members').insert({
      household_id: hh.id, profile_id: profile!.id, role: 'member',
    })
    if (error) { setJoinError('Ya sos miembro o hubo un error'); setJoining(false); return }
    window.location.href = '/dashboard'
  }

  async function createHousehold() {
    if (!newHouseholdName.trim()) return
    setCreating(true)
    const displayName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'Usuario'
    await supabase.from('profiles').upsert({
      id: user!.id, email: user!.email!, nombre: displayName, name: displayName, color: '#7c3aed',
    }, { onConflict: 'id', ignoreDuplicates: true })
    const { data: hh } = await supabase.from('households').insert({ name: newHouseholdName.trim() }).select().single()
    if (hh) {
      await supabase.from('household_members').insert({ household_id: hh.id, profile_id: profile!.id, role: 'admin' })
      window.location.href = '/dashboard'
    }
    setCreating(false)
  }

  async function executeConfirm() {
    if (!confirm || !household) return
    setActionLoading(true)

    if (confirm.type === 'leave') {
      // Delete current week assignments
      await supabase.from('weekly_assignments')
        .delete()
        .eq('household_id', household.id)
        .eq('profile_id', profile!.id)
      // Leave household
      await supabase.from('household_members')
        .delete()
        .eq('household_id', household.id)
        .eq('profile_id', profile!.id)
      window.location.href = '/dashboard'
    }

    if (confirm.type === 'remove') {
      // Delete their assignments
      await supabase.from('weekly_assignments')
        .delete()
        .eq('household_id', household.id)
        .eq('profile_id', confirm.memberId)
      // Remove from household
      await supabase.from('household_members')
        .delete()
        .eq('household_id', household.id)
        .eq('profile_id', confirm.memberId)
      window.location.reload()
    }

    setActionLoading(false)
    setConfirm(null)
  }

  if (loading || !profile) return null

  const canShare = typeof navigator !== 'undefined' && !!navigator.share

  return (
    <div>
      <div className="ht-page-header">
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>Perfil</h1>
      </div>

      <div className="ht-page" style={{ paddingTop: 16 }}>

        {/* Profile card */}
        <div className="ht-card" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 9999, overflow: 'hidden',
            background: MEMBER_GRAD[0], flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 800, color: 'white',
            boxShadow: '0 4px 12px rgba(124,58,237,0.35)',
          }}>
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : profile.name[0].toUpperCase()
            }
          </div>
          <div>
            <p style={{ fontWeight: 800, fontSize: 17, color: 'var(--ht-text)' }}>{profile.name}</p>
            <p style={{ fontSize: 13, color: 'var(--ht-text-3)' }}>{profile.email}</p>
            {isAdmin && <span className="ht-badge ht-badge-indigo" style={{ marginTop: 4, display: 'inline-flex' }}>Admin</span>}
          </div>
        </div>

        {/* Household */}
        {household ? (
          <div className="ht-card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Users size={16} color="var(--ht-purple)" />
              <span style={{ fontWeight: 800, fontSize: 16 }}>{household.name}</span>
            </div>

            {/* Members list */}
            {members.map((m, i) => (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0',
                borderBottom: i < members.length - 1 ? '1px solid var(--ht-glass-border)' : 'none',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 9999,
                  background: MEMBER_GRAD[i % 5],
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800, color: 'white',
                  overflow: 'hidden', flexShrink: 0,
                  boxShadow: '0 3px 8px rgba(0,0,0,0.12)',
                }}>
                  {m.profile?.avatar_url
                    ? <img src={m.profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : m.profile?.name?.[0]?.toUpperCase()
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{m.profile?.name}</span>
                  {m.role === 'admin' && (
                    <span style={{ fontSize: 10, color: 'var(--ht-purple)', marginLeft: 6, fontWeight: 700 }}>Admin</span>
                  )}
                </div>
                {m.profile_id === user?.id
                  ? <span className="ht-badge ht-badge-indigo">Vos</span>
                  : isAdmin && (
                    <button
                      onClick={() => setConfirm({ type: 'remove', memberId: m.profile_id, memberName: m.profile?.name ?? 'este miembro' })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ht-text-4)', padding: '4px 6px', borderRadius: 8, transition: 'color 0.15s' }}
                    >
                      <UserMinus size={16} />
                    </button>
                  )
                }
              </div>
            ))}

            {/* Invite code */}
            <div style={{ marginTop: 16, background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 16, padding: '14px 16px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ht-text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                Código de invitación
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <p style={{ fontWeight: 900, fontSize: 26, letterSpacing: '0.15em', color: 'var(--ht-purple)' }}>
                  {household.invite_code}
                </p>
                <button onClick={shareCode} className="ht-btn ht-btn-primary" style={{ padding: '9px 16px', fontSize: 13, flexShrink: 0 }}>
                  {copied ? <><Check size={14} /> Copiado</> : canShare ? <><Share2 size={14} /> Compartir</> : <><Copy size={14} /> Copiar</>}
                </button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--ht-text-4)', marginTop: 6 }}>Compartí este código para que se unan</p>
            </div>

            {/* Leave household — solo para no-admin */}
            {!isAdmin && (
              <button
                onClick={() => setConfirm({ type: 'leave' })}
                className="ht-btn"
                style={{ width: '100%', marginTop: 12, background: 'rgba(190,24,93,0.05)', color: 'var(--ht-rose)', border: '1px solid rgba(190,24,93,0.12)', justifyContent: 'center' }}
              >
                <DoorOpen size={15} /> Salir del hogar
              </button>
            )}
          </div>
        ) : (
          <div className="ht-card" style={{ marginBottom: 12 }}>
            <p style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>Sin hogar asignado</p>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ht-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Unirse con código</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="ht-input" placeholder="ABC123" value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())} style={{ letterSpacing: '0.12em', fontWeight: 800, textAlign: 'center' }} maxLength={6} />
                <button onClick={joinHousehold} disabled={joining || inviteCode.length < 4} className="ht-btn ht-btn-primary">{joining ? '...' : 'Unirse'}</button>
              </div>
              {joinError && <p style={{ fontSize: 12, color: 'var(--ht-rose)', marginTop: 6 }}>{joinError}</p>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 14px' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--ht-glass-border)' }} />
              <span style={{ fontSize: 12, color: 'var(--ht-text-4)', fontWeight: 600 }}>o</span>
              <div style={{ flex: 1, height: 1, background: 'var(--ht-glass-border)' }} />
            </div>
            <button onClick={() => setShowCreate(true)} className="ht-btn ht-btn-ghost" style={{ width: '100%' }}>
              <Home size={15} /> Crear nuevo hogar
            </button>
          </div>
        )}

        <button onClick={logout} className="ht-btn" style={{ width: '100%', background: 'rgba(190,24,93,0.05)', color: 'var(--ht-rose)', border: '1px solid rgba(190,24,93,0.12)', justifyContent: 'center' }}>
          <LogOut size={15} /> Cerrar sesión
        </button>
      </div>

      {/* Modal crear hogar */}
      {showCreate && (
        <>
          <div className="ht-overlay" onClick={() => setShowCreate(false)} />
          <div className="ht-modal">
            <div style={{ padding: '20px 16px 0' }}>
              <div style={{ width: 36, height: 4, background: 'rgba(124,58,237,0.2)', borderRadius: 9999, margin: '0 auto 20px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 17, fontWeight: 800 }}>Crear hogar</h2>
                <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ht-text-3)', padding: 4 }}><X size={20} /></button>
              </div>
            </div>
            <div style={{ padding: '0 16px 32px' }}>
              <input className="ht-input" placeholder="Ej: Casa García, Depto Centro..." value={newHouseholdName} onChange={e => setNewHouseholdName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createHousehold()} autoFocus style={{ marginBottom: 20 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowCreate(false)} className="ht-btn ht-btn-ghost" style={{ flex: 1 }}>Cancelar</button>
                <button onClick={createHousehold} disabled={creating || !newHouseholdName.trim()} className="ht-btn ht-btn-primary" style={{ flex: 2 }}>
                  {creating ? <><div className="ht-spinner" /> Creando...</> : <><Home size={15} /> Crear hogar</>}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal confirmación salir/remover */}
      {confirm && (
        <>
          <div className="ht-overlay" onClick={() => !actionLoading && setConfirm(null)} />
          <div className="ht-modal">
            <div style={{ padding: '28px 20px 32px', textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: 9999, background: 'rgba(190,24,93,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <AlertTriangle size={24} color="var(--ht-rose)" />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
                {confirm.type === 'leave' ? '¿Salir del hogar?' : `¿Remover a ${confirm.memberName}?`}
              </h2>
              <p style={{ fontSize: 14, color: 'var(--ht-text-3)', marginBottom: 24, lineHeight: 1.6 }}>
                {confirm.type === 'leave'
                  ? 'Se eliminarán tus asignaciones de la semana. Podés volver a unirte cuando quieras con el código.'
                  : `Se eliminarán las asignaciones de ${confirm.memberName}. Podrá volver a unirse con el código del hogar.`
                }
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setConfirm(null)} disabled={actionLoading} className="ht-btn ht-btn-ghost" style={{ flex: 1 }}>Cancelar</button>
                <button onClick={executeConfirm} disabled={actionLoading} className="ht-btn ht-btn-danger" style={{ flex: 1 }}>
                  {actionLoading ? <div className="ht-spinner" style={{ borderTopColor: 'var(--ht-rose)' }} /> : confirm.type === 'leave' ? 'Salir' : 'Remover'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
