'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { ChangeProposal } from '@/lib/types'
import { Plus, X, ThumbsUp, ThumbsDown, Clock, CheckCircle, XCircle } from 'lucide-react'

const TYPE_LABELS: Record<ChangeProposal['type'], string> = {
  add_chore: 'Agregar tarea',
  remove_chore: 'Eliminar tarea',
  reassign: 'Reasignar',
  apply_template: 'Aplicar plantilla',
}

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

  useEffect(() => { if (household) load() }, [household])

  async function load() {
    const { data } = await supabase.from('change_proposals')
      .select('*, proposer:proposed_by(name, avatar_url), votes:proposal_votes(*, profile:profile_id(name))')
      .eq('household_id', household!.id)
      .order('created_at', { ascending: false })
    setProposals((data ?? []) as ChangeProposal[])
    setLoading(false)
  }

  async function createProposal() {
    if (!newDesc.trim()) return
    setSaving(true)
    const { data } = await supabase.from('change_proposals')
      .insert({ household_id: household!.id, proposed_by: user!.id, type: newType, description: newDesc.trim(), votes_needed: members.length })
      .select('*, proposer:proposed_by(name, avatar_url), votes:proposal_votes(*)').single()
    if (data) { setProposals(prev => [data as ChangeProposal, ...prev]); setNewDesc(''); setShowNew(false) }
    setSaving(false)
  }

  async function vote(proposalId: string, v: boolean) {
    setVoting(proposalId)
    const existing = proposals.find(p => p.id === proposalId)?.votes?.find(x => x.profile_id === user!.id)
    if (existing) await supabase.from('proposal_votes').update({ vote: v }).eq('id', existing.id)
    else await supabase.from('proposal_votes').insert({ proposal_id: proposalId, profile_id: user!.id, vote: v })

    const { data: votes } = await supabase.from('proposal_votes').select('vote').eq('proposal_id', proposalId)
    const yes = (votes ?? []).filter(x => x.vote).length
    const no = (votes ?? []).filter(x => !x.vote).length
    if (yes >= members.length) await supabase.from('change_proposals').update({ status: 'approved' }).eq('id', proposalId)
    else if (no > 0) await supabase.from('change_proposals').update({ status: 'rejected' }).eq('id', proposalId)

    await load(); setVoting(null)
  }

  const STATUS = {
    pending: { icon: Clock, color: 'var(--ht-yellow)', label: 'Pendiente', badge: 'ht-badge-yellow' },
    approved: { icon: CheckCircle, color: 'var(--ht-green)', label: 'Aprobada', badge: 'ht-badge-green' },
    rejected: { icon: XCircle, color: 'var(--ht-red)', label: 'Rechazada', badge: 'ht-badge-red' },
  }

  return (
    <div>
      <div className="ht-page-header" style={{ paddingRight: 52 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800 }}>Votaciones</h1>
            <p style={{ fontSize: 13, color: 'var(--ht-text-3)', marginTop: 2 }}>
              Se necesitan {members.length}/{members.length} votos para aprobar
            </p>
          </div>
          <button onClick={() => setShowNew(true)} className="ht-btn ht-btn-primary" style={{ padding: '7px 12px', fontSize: 13 }}>
            <Plus size={14} /> Proponer
          </button>
        </div>
      </div>

      <div className="ht-page" style={{ paddingTop: 16 }}>
        {loading && <div style={{ color: 'var(--ht-text-3)', textAlign: 'center', padding: 40, fontSize: 14 }}>Cargando...</div>}

        {!loading && proposals.length === 0 && (
          <div className="ht-empty">
            <p style={{ fontWeight: 700, marginBottom: 4, fontSize: 16 }}>Sin propuestas</p>
            <p style={{ fontSize: 14 }}>Proponé un cambio y el hogar vota</p>
            <button onClick={() => setShowNew(true)} className="ht-btn ht-btn-primary" style={{ marginTop: 16 }}>
              <Plus size={14} /> Hacer propuesta
            </button>
          </div>
        )}

        {proposals.map(p => {
          const status = STATUS[p.status]
          const StatusIcon = status.icon
          const yes = p.votes?.filter(v => v.vote).length ?? 0
          const myVote = p.votes?.find(v => v.profile_id === user?.id)
          const total = members.length

          return (
            <div key={p.id} className="ht-card" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <span className={`ht-badge ${p.status === 'pending' ? 'ht-badge-indigo' : status.badge}`} style={{ marginBottom: 6, display: 'inline-flex' }}>
                    {TYPE_LABELS[p.type]}
                  </span>
                  <p style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3, color: 'var(--ht-text)' }}>
                    {p.description}
                  </p>
                </div>
                <span className={`ht-badge ${status.badge}`} style={{ marginLeft: 8, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <StatusIcon size={11} /> {status.label}
                </span>
              </div>

              <div style={{ marginBottom: p.status === 'pending' ? 10 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ht-text-3)', marginBottom: 4 }}>
                  <span>{yes} a favor</span>
                  <span>{yes}/{total}</span>
                </div>
                <div className="ht-vote-bar">
                  <div className="ht-vote-fill" style={{ width: `${(yes / total) * 100}%` }} />
                </div>
              </div>

              {p.status === 'pending' && (
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  <button onClick={() => vote(p.id, true)} disabled={voting === p.id} style={{
                    flex: 1, padding: '8px', borderRadius: 8, border: '1.5px solid',
                    borderColor: myVote?.vote === true ? 'var(--ht-green)' : 'var(--ht-line)',
                    background: myVote?.vote === true ? 'var(--ht-green-light)' : 'var(--ht-surface)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    fontWeight: 700, fontSize: 13, color: myVote?.vote === true ? '#065f46' : 'var(--ht-text-3)',
                  }}>
                    <ThumbsUp size={14} /> A favor
                  </button>
                  <button onClick={() => vote(p.id, false)} disabled={voting === p.id} style={{
                    flex: 1, padding: '8px', borderRadius: 8, border: '1.5px solid',
                    borderColor: myVote?.vote === false ? 'var(--ht-red)' : 'var(--ht-line)',
                    background: myVote?.vote === false ? 'var(--ht-red-light)' : 'var(--ht-surface)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    fontWeight: 700, fontSize: 13, color: myVote?.vote === false ? '#991b1b' : 'var(--ht-text-3)',
                  }}>
                    <ThumbsDown size={14} /> En contra
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 16px 12px', borderBottom: '1px solid var(--ht-line)' }}>
              <h2 style={{ fontSize: 17, fontWeight: 800 }}>Nueva propuesta</h2>
              <button onClick={() => setShowNew(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ht-text-3)', padding: 4 }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '16px 16px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
                {(Object.entries(TYPE_LABELS) as [ChangeProposal['type'], string][]).map(([type, label]) => (
                  <button key={type} onClick={() => setNewType(type)} style={{
                    padding: '9px 8px', borderRadius: 8, border: '1.5px solid',
                    borderColor: newType === type ? 'var(--ht-indigo)' : 'var(--ht-line)',
                    background: newType === type ? 'var(--ht-indigo-light)' : 'var(--ht-surface)',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    color: newType === type ? 'var(--ht-indigo)' : 'var(--ht-text-3)',
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
                style={{ resize: 'none', marginBottom: 10 }}
              />
              <p style={{ fontSize: 12, color: 'var(--ht-text-3)', marginBottom: 12 }}>
                Necesitás los {members.length} votos del hogar para aprobar.
              </p>
              <button onClick={createProposal} disabled={saving || !newDesc.trim()} className="ht-btn ht-btn-primary" style={{ width: '100%' }}>
                {saving ? 'Publicando...' : 'Publicar propuesta'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
