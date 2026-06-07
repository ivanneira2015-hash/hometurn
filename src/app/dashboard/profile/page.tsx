'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Copy, LogOut, Users, CheckCheck } from 'lucide-react'

export default function ProfilePage() {
  const { user, profile, household, members, loading } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [copied, setCopied] = useState(false)
  const [joining, setJoining] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
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
    setJoining(true)
    setJoinError('')
    const { data: hh } = await supabase
      .from('households')
      .select('id')
      .eq('invite_code', inviteCode.trim().toUpperCase())
      .single()

    if (!hh) {
      setJoinError('Código no válido')
      setJoining(false)
      return
    }

    const { error } = await supabase.from('household_members').insert({
      household_id: hh.id, profile_id: user!.id, role: 'member',
    })
    if (error) setJoinError('Ya sos miembro de este hogar o hubo un error')
    else window.location.reload()
    setJoining(false)
  }

  async function createHousehold() {
    const name = prompt('Nombre del hogar (ej: Casa Familiar)')
    if (!name?.trim()) return
    const { data: hh } = await supabase
      .from('households')
      .insert({ name: name.trim() })
      .select()
      .single()
    if (hh) {
      await supabase.from('household_members').insert({
        household_id: hh.id, profile_id: user!.id, role: 'admin',
      })
      window.location.reload()
    }
  }

  if (loading || !profile) return null

  const memberColors = ['#7c3aed', '#ec4899', '#f97316', '#10b981', '#3b82f6']

  return (
    <div>
      <div className="ht-header-gradient" style={{ paddingBottom: 60 }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Perfil</h1>
        </div>
      </div>

      <div className="ht-page" style={{ marginTop: -44 }}>
        {/* Profile card */}
        <div className="ht-card" style={{ marginBottom: 16, textAlign: 'center', paddingTop: 24, paddingBottom: 24 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', margin: '0 auto 12px',
            overflow: 'hidden', border: '3px solid var(--ht-purple-light)',
            background: 'var(--ht-purple)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, color: 'white', fontWeight: 700,
          }}>
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : profile.name[0].toUpperCase()
            }
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>{profile.name}</h2>
          <p style={{ fontSize: 14, color: 'var(--ht-text-3)' }}>{profile.email}</p>
        </div>

        {/* Household card */}
        {household ? (
          <div className="ht-card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Users size={18} color="var(--ht-purple)" />
              <span style={{ fontWeight: 700, fontSize: 16 }}>{household.name}</span>
            </div>

            <div style={{ marginBottom: 14 }}>
              {members.map((m, i) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < members.length - 1 ? '1px solid var(--ht-line)' : 'none' }}>
                  <div className="ht-avatar" style={{ background: memberColors[i % 5], width: 32, height: 32, fontSize: 12 }}>
                    {m.profile?.avatar_url
                      ? <img src={m.profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      : m.profile?.name?.[0]?.toUpperCase()
                    }
                  </div>
                  <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{m.profile?.name}</span>
                  {m.profile_id === user?.id && (
                    <span style={{ fontSize: 11, color: 'var(--ht-purple)', background: 'var(--ht-purple-light)', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                      Vos
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--ht-surface-2)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--ht-text-3)', marginBottom: 2 }}>Código de invitación</div>
                <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '0.1em', color: 'var(--ht-purple)' }}>
                  {household.invite_code}
                </div>
              </div>
              <button onClick={copyCode} className="ht-btn ht-btn-ghost" style={{ padding: '8px 12px' }}>
                {copied ? <CheckCheck size={16} /> : <Copy size={16} />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>
        ) : (
          <div className="ht-card" style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>No pertenecés a ningún hogar</p>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ht-text-3)', marginBottom: 6 }}>Unirse con código</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="ht-input"
                  placeholder="ABC123"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}
                />
                <button onClick={joinHousehold} disabled={joining} className="ht-btn ht-btn-primary">
                  {joining ? '...' : 'Unirse'}
                </button>
              </div>
              {joinError && <p style={{ fontSize: 12, color: 'var(--ht-red)', marginTop: 4 }}>{joinError}</p>}
            </div>

            <div style={{ textAlign: 'center', color: 'var(--ht-text-3)', fontSize: 13, margin: '8px 0' }}>— o —</div>

            <button onClick={createHousehold} className="ht-btn ht-btn-ghost" style={{ width: '100%' }}>
              🏠 Crear nuevo hogar
            </button>
          </div>
        )}

        <button onClick={logout} className="ht-btn ht-btn-danger" style={{ width: '100%' }}>
          <LogOut size={16} /> Cerrar sesión
        </button>
      </div>
    </div>
  )
}
