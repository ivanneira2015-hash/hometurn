'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Copy, LogOut, Users, Check } from 'lucide-react'

const MEMBER_COLORS = ['#6366f1','#10b981','#f97316','#3b82f6','#ec4899']

export default function ProfilePage() {
  const { user, profile, household, members, loading } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [copied, setCopied] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [loading, user])

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  async function copyCode() {
    if (!household?.invite_code) return
    await navigator.clipboard.writeText(household.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function joinHousehold() {
    if (!inviteCode.trim()) return
    setJoining(true); setJoinError('')
    const { data: hh } = await supabase.from('households').select('id')
      .eq('invite_code', inviteCode.trim().toUpperCase()).single()
    if (!hh) { setJoinError('Código no válido'); setJoining(false); return }
    const { error } = await supabase.from('household_members').insert({ household_id: hh.id, profile_id: profile!.id, role: 'member' })
    if (error) { setJoinError('Ya sos miembro o hubo un error'); setJoining(false); return }
    window.location.reload()
  }

  async function createHousehold() {
    const name = prompt('Nombre del hogar (ej: Casa García)')
    if (!name?.trim()) return
    const { data: hh } = await supabase.from('households').insert({ name: name.trim() }).select().single()
    if (hh) {
      await supabase.from('household_members').insert({ household_id: hh.id, profile_id: profile!.id, role: 'admin' })
      window.location.reload()
    }
  }

  if (loading || !profile) return null

  return (
    <div>
      <div className="ht-page-header">
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>Perfil</h1>
      </div>

      <div className="ht-page" style={{ paddingTop: 16 }}>
        {/* Profile */}
        <div className="ht-card" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', overflow: 'hidden',
            background: 'var(--ht-indigo)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 22, fontWeight: 700, color: 'white', flexShrink: 0,
          }}>
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : profile.name[0].toUpperCase()
            }
          </div>
          <div>
            <p style={{ fontWeight: 800, fontSize: 17 }}>{profile.name}</p>
            <p style={{ fontSize: 13, color: 'var(--ht-text-3)' }}>{profile.email}</p>
          </div>
        </div>

        {/* Household */}
        {household ? (
          <div className="ht-card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Users size={16} color="var(--ht-indigo)" />
              <span style={{ fontWeight: 700, fontSize: 15 }}>{household.name}</span>
            </div>

            {members.map((m, i) => (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 0', borderBottom: i < members.length - 1 ? '1px solid var(--ht-line)' : 'none',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: MEMBER_COLORS[i % 5], display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: 'white', overflow: 'hidden', flexShrink: 0,
                }}>
                  {m.profile?.avatar_url
                    ? <img src={m.profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : m.profile?.name?.[0]?.toUpperCase()
                  }
                </div>
                <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{m.profile?.name}</span>
                {m.profile_id === user?.id && (
                  <span className="ht-badge ht-badge-indigo">Vos</span>
                )}
              </div>
            ))}

            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginTop: 14,
              background: 'var(--ht-surface-2)', borderRadius: 10, padding: '12px 14px',
            }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, color: 'var(--ht-text-3)', marginBottom: 2, fontWeight: 500 }}>Código de invitación</p>
                <p style={{ fontWeight: 800, fontSize: 22, letterSpacing: '0.12em', color: 'var(--ht-indigo)' }}>
                  {household.invite_code}
                </p>
              </div>
              <button onClick={copyCode} className="ht-btn ht-btn-ghost" style={{ padding: '8px 12px', fontSize: 13 }}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>
        ) : (
          <div className="ht-card" style={{ marginBottom: 12 }}>
            <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>No pertenecés a ningún hogar</p>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ht-text-3)', display: 'block', marginBottom: 6 }}>
                Unirse con código
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="ht-input"
                  placeholder="ABC123"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  style={{ letterSpacing: '0.1em', fontWeight: 700 }}
                  maxLength={6}
                />
                <button onClick={joinHousehold} disabled={joining} className="ht-btn ht-btn-primary">
                  {joining ? '...' : 'Unirse'}
                </button>
              </div>
              {joinError && <p style={{ fontSize: 12, color: 'var(--ht-red)', marginTop: 6 }}>{joinError}</p>}
            </div>
            <div style={{ textAlign: 'center', color: 'var(--ht-text-4)', fontSize: 12, margin: '8px 0' }}>o</div>
            <button onClick={createHousehold} className="ht-btn ht-btn-ghost" style={{ width: '100%' }}>
              Crear nuevo hogar
            </button>
          </div>
        )}

        <button onClick={logout} className="ht-btn ht-btn-ghost" style={{ width: '100%', color: 'var(--ht-red)', borderColor: 'var(--ht-red-light)' }}>
          <LogOut size={15} /> Cerrar sesión
        </button>
      </div>
    </div>
  )
}
