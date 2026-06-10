'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Search, CalendarRange, TrendingUp, CheckSquare, X } from 'lucide-react'

interface Result {
  id: string
  type: 'event' | 'transaction' | 'task' | 'list'
  title: string
  subtitle: string
  href: string
  color: string
}

export default function SearchPage() {
  const { user, household } = useAuth()
  const supabase = createClient()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)

  const search = useCallback(async (q: string) => {
    if (!q.trim() || !household || !user) { setResults([]); return }
    setLoading(true)
    const q_lower = `%${q.toLowerCase()}%`

    const [{ data: events }, { data: txs }, { data: lists }] = await Promise.all([
      supabase.from('calendar_events').select('id,title,date,type')
        .eq('household_id', household.id).or(`visibility.eq.shared,profile_id.eq.${user.id}`)
        .ilike('title', q_lower).limit(5),
      supabase.from('transactions').select('id,description,amount,type,date,category:expense_categories(name,icon)')
        .eq('household_id', household.id).or(`visibility.eq.shared,profile_id.eq.${user.id}`)
        .ilike('description', q_lower).limit(5),
      supabase.from('task_lists').select('id,name,type')
        .eq('household_id', household.id).ilike('name', q_lower).limit(5),
    ])

    const all: Result[] = [
      ...(events ?? []).map(e => ({
        id: e.id, type: 'event' as const,
        title: e.title,
        subtitle: new Date(e.date+'T12:00:00').toLocaleDateString('es-AR',{weekday:'short',day:'numeric',month:'short'}),
        href: '/dashboard/agenda',
        color: '#C8956C',
      })),
      ...(txs ?? []).map(t => ({
        id: t.id, type: 'transaction' as const,
        title: t.description ?? (t.category as any)?.name ?? 'Movimiento',
        subtitle: `${t.type==='income'?'+':'-'}$${Math.round(Number(t.amount)).toLocaleString()} · ${t.date}`,
        href: '/dashboard/finances',
        color: t.type === 'income' ? '#3D6B42' : '#8B2020',
      })),
      ...(lists ?? []).map(l => ({
        id: l.id, type: 'list' as const,
        title: l.name,
        subtitle: l.type === 'shopping' ? 'Lista de compras' : l.type === 'todo' ? 'Pendientes' : 'Lista personalizada',
        href: '/dashboard/tasks',
        color: '#b45309',
      })),
    ]
    setResults(all)
    setLoading(false)
  }, [household, user])

  const TYPE_ICONS = { event: CalendarRange, transaction: TrendingUp, task: CheckSquare, list: CheckSquare }

  return (
    <div>
      <div className="ht-page-header" style={{ paddingRight: 52 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>Buscar</h1>
        <div style={{ position: 'relative' }}>
          <Search size={16} color="var(--ht-text-4)" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
          <input
            className="ht-input"
            placeholder="Buscar eventos, gastos, listas..."
            value={query}
            onChange={e => { setQuery(e.target.value); search(e.target.value) }}
            style={{ paddingLeft: 40 }}
            autoFocus
          />
          {query && (
            <button onClick={() => { setQuery(''); setResults([]) }} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--ht-text-4)' }}>
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="ht-page" style={{ paddingTop: 16 }}>
        {loading && (
          <div style={{ textAlign:'center', padding:40 }}>
            <div className="ht-spinner ht-spinner-dark" style={{ margin:'0 auto' }} />
          </div>
        )}

        {!loading && query && results.length === 0 && (
          <div className="ht-empty">
            <Search size={28} color="rgba(200,149,108,0.2)" style={{ margin:'0 auto 12px', display:'block' }} />
            <p style={{ fontWeight:700, marginBottom:4 }}>Sin resultados</p>
            <p style={{ fontSize:13 }}>Probá con otro término de búsqueda</p>
          </div>
        )}

        {!loading && !query && (
          <div className="ht-empty">
            <Search size={32} color="rgba(200,149,108,0.2)" style={{ margin:'0 auto 12px', display:'block' }} />
            <p style={{ fontWeight:700, marginBottom:4 }}>Buscar en el hogar</p>
            <p style={{ fontSize:13 }}>Eventos, gastos, listas y más</p>
          </div>
        )}

        {results.map(r => {
          const Icon = TYPE_ICONS[r.type]
          return (
            <a key={r.id} href={r.href} style={{ textDecoration:'none' }}>
              <div className="ht-list-item" style={{ marginBottom:8 }}>
                <Icon size={20} color={r.color} strokeWidth={1.8} style={{ flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <p style={{ fontWeight:700, fontSize:14 }}>{r.title}</p>
                  <p style={{ fontSize:12, color:'var(--ht-text-3)' }}>{r.subtitle}</p>
                </div>
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}
