'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { ChangeProposal } from '@/lib/types'
import { Plus, X, ThumbsUp, ThumbsDown, Clock, CheckCircle, XCircle } from 'lucide-react'

export default function VotesPage() {
  const { user, household, members } = useAuth()
  const supabase = createClient()
  const [proposals, setProposals] = useState<ChangeProposal[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newDesc, setNewDesc] = useState('')
  const [newType, setNewType] = useState<ChangeProposal['type']>('add_chore')
  const [saving, setSaving] = useState(false)
  const [voting, setVoting] = useState<string | null>(null)

  useEffect(() => {
    if (household) loadProposals()
  }, [household])

  async function loadProposals() {
    const { data } = await supabase
      .from('change_proposals')
      .select('*, proposer:proposed_by(name, avatar_url, color), votes:proposal_votes(*, profile:profile_id(name, avatar_url))')
      .eq('household_id', household!.id)
      .order('created_at', { ascending: false })
    setProposals((data ?? []) as ChangeProposal[])
    setLoading(false)
  }

  async function createProposal() {
    if (!newDesc.trim()) return
    setSaving(true)
    const { data } = await supabase
      .from('change_proposals')
      .insert({
        household_id: household!.id,
        proposed_by: user!.id,
        type: newType,
        description: newDesc.trim(),
        votes_needed: members.length,
      })
      .select('*, proposer:proposed_by(name, avatar_url), votes:proposal_votes(*)')
      .single()
    if (data) {
      setProposals(prev => [data as ChangeProposal, ...prev])
      setNewDesc('')
      setShowNew(false)
    }
    setSaving(false)
  }

  async function vote(proposalId: string, voteValue: boolean) {
    setVoting(proposalId)
    const existing = proposals.find(p => p.id === proposalId)?.votes?.find(v => v.profile_id === user!.id)
    if (existing) {
      await supabase.from('proposal_votes').update({ vote: voteValue }).eq('id', existing.id)
    } else {
      await supabase.from('proposal_votes').insert({ proposal_id: proposalId, profile_id: user!.id, vote: voteValue })
    }

    // Check if all voted yes → approve
    const updated = await supabase
      .from('proposal_votes')
      .select('vote')
      .eq('proposal_id', proposalId)
    const votes = updated.data ?? []
    const yesVotes = votes.filter(v => v.vote).length
    const noVotes = votes.filter(v => !v.vote).length
    if (yesVotes >= members.length) {
      await supabase.from('change_proposals').update({ status: 'approved' }).eq('id', proposalId)
    } else if (noVotes > 0) {
      await supabase.from('change_proposals').update({ status: 'rejected' }).eq('id', proposalId)
    }

    await loadProposals()
    setVoting(null)
  }

  const TYPE_LABELS: Record<ChangeProposal['type'], string> = {
    add_chore: '➕ Agregar tarea',
    remove_chore: '🗑️ Eliminar tarea',
    reassign: '🔄 Reasignar',
    apply_template: '📋 Aplicar plantilla',
  }

  const STATUS_CONFIG = {
    pending: { icon: Clock, color: 'var(--ht-yellow)', bg: 'var(--ht-yellow-light)', label: 'Pendiente' },
    approved: { icon: CheckCircle, color: 'var(--ht-green)', bg: 'var(--ht-green-light)', label: 'Aprobada' },
    rejected: { icon: XCircle, color: 'var(--ht-red)', bg: 'var(--ht-red-light)', label: 'Rechazada' },
  }

  return (
    <div>
      <div className="ht-header-gradient" style={{ paddingBottom: 28 }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800 }}>Votaciones</h1>
              <p style={{ opacity: 0.75, fontSize: 13, marginTop: 2 }}>
                Se necesitan {members.length}/{members.length} votos para aprobar
              </p>
            </div>
            <button onClick={() => setShowNew(true)} style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 10,
              color: 'white', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Plus size={15} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Proponer</span>
            </button>
          </div>
        </div>
      </div>

      <div className="ht-page" style={{ marginTop: 12 }}>
        {loading && <div style={{ color: 'var(--ht-text-3)', textAlign: 'center', padding: 40 }}>Cargando...</div>}

        {!loading && proposals.length === 0 && (
          <div className="ht-empty">
            <div style={{ fontSize: 48, marginBottom: 12 }}>🗳️</div>
            <p style={{ fontWeight: 700, marginBottom: 4 }}>Sin propuestas</p>
            <p style={{ fontSize: 14 }}>Proponé un cambio y el hogar vota</p>
            <button onClick={() => setShowNew(true)} className="ht-btn ht-btn-primary" style={{ marginTop: 16 }}>
              <Plus size={16} /> Hacer propuesta
            </button>
          </div>
        )}

        {proposals.map(proposal => {
          const status = STATUS_CONFIG[proposal.status]
          const StatusIcon = status.icon
          const yesVotes = proposal.votes?.filter(v => v.vote).length ?? 0
          const noVotes = proposal.votes?.filter(v => !v.vote).length ?? 0
          const myVote = proposal.votes?.find(v => v.profile_id === user?.id)
          const total = members.length

          return (
            <div key={proposal.id} className="ht-card" style={{ marginBottom: 14 }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: 'var(--ht-purple)',
                    background: 'var(--ht-purple-light)', padding: '2px 8px', borderRadius: 20,
                  }}>
                    {TYPE_LABELS[proposal.type]}
                  </span>
                  <p style={{ fontWeight: 700, fontSize: 15, marginTop: 8, lineHeight: 1.3 }}>
                    {proposal.description}
                  </p>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginLeft: 8,
                  background: status.bg, borderRadius: 20, padding: '3px 8px',
                }}>
                  <StatusIcon size={12} color={status.color} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: status.color }}>{status.label}</span>
                </div>
              </div>

              {/* Vote bar */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ht-text-3)', marginBottom: 4 }}>
                  <span>👍 {yesVotes} a favor</span>
                  <span>{yesVotes}/{total} necesarios</span>
                </div>
                <div className="ht-vote-bar">
                  <div className="ht-vote-fill" style={{ width: `${(yesVotes / total) * 100}%` }} />
                </div>
              </div>

              {/* Vote buttons */}
              {proposal.status === 'pending' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => vote(proposal.id, true)}
                    disabled={voting === proposal.id}
                    style={{
                      flex: 1, padding: '8px', borderRadius: 10, border: '2px solid',
                      borderColor: myVote?.vote === true ? 'var(--ht-green)' : 'var(--ht-line)',
                      background: myVote?.vote === true ? 'var(--ht-green-light)' : 'white',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      fontWeight: 700, fontSize: 13, color: myVote?.vote === true ? 'var(--ht-green)' : 'var(--ht-text-3)',
                    }}
                  >
                    <ThumbsUp size={15} /> A favor
                  </button>
                  <button
                    onClick={() => vote(proposal.id, false)}
                    disabled={voting === proposal.id}
                    style={{
                      flex: 1, padding: '8px', borderRadius: 10, border: '2px solid',
                      borderColor: myVote?.vote === false ? 'var(--ht-red)' : 'var(--ht-line)',
                      background: myVote?.vote === false ? 'var(--ht-red-light)' : 'white',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      fontWeight: 700, fontSize: 13, color: myVote?.vote === false ? 'var(--ht-red)' : 'var(--ht-text-3)',
                    }}
                  >
                    <ThumbsDown size={15} /> En contra
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showNew && (
        <>
          <div className="ht-overlay" onClick={() => setShowNew(false)} />
          <div className="ht-modal">
            <div style={{ padding: '20px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>Nueva Propuesta</h2>
              <button onClick={() => setShowNew(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ht-text-3)' }}>
                <X size={22} />
              </button>
            </div>
            <div style={{ padding: '0 16px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                {(Object.entries(TYPE_LABELS) as [ChangeProposal['type'], string][]).map(([type, label]) => (
                  <button key={type} onClick={() => setNewType(type)} style={{
                    padding: '10px 8px', borderRadius: 10, border: '2px solid',
                    borderColor: newType === type ? 'var(--ht-purple)' : 'var(--ht-line)',
                    background: newType === type ? 'var(--ht-purple-light)' : 'white',
                    cursor: 'pointer', fontSize: 12, fontWeight: 700,
                    color: newType === type ? 'var(--ht-purple)' : 'var(--ht-text-3)',
                  }}>
                    {label}
                  </button>
                ))}
              </div>
              <textarea
                className="ht-input"
                placeholder="Describí el cambio que proponés..."
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                rows={3}
                style={{ resize: 'none', marginBottom: 12 }}
              />
              <p style={{ fontSize: 12, color: 'var(--ht-text-3)', marginBottom: 12 }}>
                Se necesitan los {members.length} votos del hogar para aprobar el cambio.
              </p>
              <button onClick={createProposal} disabled={saving || !newDesc.trim()} className="ht-btn ht-btn-primary" style={{ width: '100%' }}>
                {saving ? 'Publicando...' : '🗳️ Publicar propuesta'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
