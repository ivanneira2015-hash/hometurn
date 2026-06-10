'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { TaskList, TaskItem } from '@/lib/types'
import { Plus, X, Check, ShoppingCart, ClipboardList, Sparkles, Trash2, ChevronRight, Lock, Globe } from 'lucide-react'
import EmptyState from '@/components/EmptyState'

const LIST_TYPES = [
  { type: 'shopping' as const, icon: ShoppingCart, label: 'Compras',       color: '#047857', light: 'rgba(4,120,87,0.08)'  },
  { type: 'todo'     as const, icon: ClipboardList, label: 'Pendientes',    color: '#7c3aed', light: 'rgba(124,58,237,0.1)'  },
  { type: 'custom'   as const, icon: Sparkles,      label: 'Personalizada', color: '#f59e0b', light: 'rgba(245,158,11,0.1)'  },
]

type Filter = 'all' | 'shared' | 'private'

export default function TasksPage() {
  const { user, profile, household } = useAuth()
  const supabase = createClient()
  const [lists, setLists] = useState<TaskList[]>([])
  const [selected, setSelected] = useState<TaskList | null>(null)
  const [items, setItems] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewList, setShowNewList] = useState(false)
  const [newItemText, setNewItemText] = useState('')
  const [newListName, setNewListName] = useState('')
  const [newListType, setNewListType] = useState<TaskList['type']>('todo')
  const [newListVisibility, setNewListVisibility] = useState<'shared' | 'private'>('shared')
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => { if (household) loadLists() }, [household])
  useEffect(() => { if (selected) loadItems(selected.id) }, [selected])

  async function loadLists() {
    const { data } = await supabase
      .from('task_lists')
      .select('*')
      .eq('household_id', household!.id)
      .order('created_at')
    // Show shared lists + user's own private lists
    const visible = (data ?? []).filter((l: TaskList) =>
      l.visibility === 'shared' || l.created_by === profile?.id
    )
    setLists(visible)
    setLoading(false)
  }

  async function loadItems(listId: string) {
    const { data } = await supabase.from('task_items').select('*')
      .eq('list_id', listId).order('sort_order').order('created_at')
    setItems(data ?? [])
  }

  async function createList() {
    if (!newListName.trim()) return
    const t = LIST_TYPES.find(x => x.type === newListType)!
    const { data } = await supabase.from('task_lists').insert({
      household_id: household!.id, name: newListName.trim(),
      type: newListType, icon: '•', color: t.color,
      created_by: profile!.id,
      visibility: newListVisibility,
    }).select().single()
    if (data) {
      setLists(prev => [...prev, data])
      setSelected(data)
      setShowNewList(false)
      setNewListName('')
      setNewListVisibility('shared')
    }
  }

  async function addItem() {
    if (!newItemText.trim() || !selected) return
    const { data } = await supabase.from('task_items').insert({
      list_id: selected.id, title: newItemText.trim(), completed: false,
      created_by: profile!.id, sort_order: items.length,
    }).select().single()
    if (data) { setItems(prev => [...prev, data]); setNewItemText('') }
  }

  async function toggleItem(id: string, current: boolean) {
    const update = current
      ? { completed: false, completed_by: null, completed_at: null }
      : { completed: true, completed_by: profile!.id, completed_at: new Date().toISOString() }
    await supabase.from('task_items').update(update).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...update } : i))
  }

  async function deleteItem(id: string) {
    await supabase.from('task_items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function deleteList(id: string) {
    await supabase.from('task_lists').delete().eq('id', id)
    setLists(prev => prev.filter(l => l.id !== id))
    if (selected?.id === id) { setSelected(null); setItems([]) }
  }

  const pending = items.filter(i => !i.completed)
  const done = items.filter(i => i.completed)

  const filteredLists = lists.filter(l => {
    if (filter === 'shared')  return l.visibility === 'shared'
    if (filter === 'private') return l.visibility === 'private'
    return true
  })

  return (
    <div>
      <div className="ht-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: selected ? 0 : 12 }}>
          <div>
            {selected ? (
              <>
                <button onClick={() => { setSelected(null); setItems([]) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--ht-purple)', fontWeight: 700, padding: 0, marginBottom: 4 }}>
                  ← Volver
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h1 style={{ fontSize: 20, fontWeight: 800 }}>{selected.name}</h1>
                  {selected.visibility === 'private'
                    ? <Lock size={14} color="var(--ht-text-3)" />
                    : <Globe size={14} color="var(--ht-mint)" />
                  }
                </div>
                <p style={{ fontSize: 13, color: 'var(--ht-text-3)', marginTop: 2 }}>
                  {pending.length} pendiente{pending.length !== 1 ? 's' : ''} · {done.length} completado{done.length !== 1 ? 's' : ''}
                </p>
              </>
            ) : (
              <h1 style={{ fontSize: 20, fontWeight: 800 }}>Listas</h1>
            )}
          </div>
          {!selected && (
            <button onClick={() => setShowNewList(true)} className="ht-btn ht-btn-primary" style={{ padding: '7px 14px', fontSize: 13 }}>
              <Plus size={14} /> Nueva
            </button>
          )}
        </div>

        {/* Filter tabs — solo en vista de listado */}
        {!selected && (
          <div style={{ display: 'flex', gap: 6 }}>
            {([['all', 'Todas'], ['shared', 'Compartidas'], ['private', 'Privadas']] as const).map(([f, label]) => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '5px 12px', borderRadius: 9999, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 700,
                background: filter === f ? 'var(--ht-purple)' : 'rgba(124,58,237,0.08)',
                color: filter === f ? 'white' : 'var(--ht-purple)',
                transition: 'all 0.15s',
              }}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="ht-page" style={{ paddingTop: 16 }}>
        {!selected ? (
          <>
            {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--ht-text-3)', fontSize: 14 }}>Cargando...</div>}
            {!loading && filteredLists.length === 0 && (
              <EmptyState
                type="tasks"
                title={filter==='private'?'Sin listas privadas':filter==='shared'?'Sin listas compartidas':'Sin listas'}
                desc={filter==='all'?'Creá tu primera lista de compras o pendientes':undefined}
                action={filter==='all'?{ label:'Nueva lista', onClick:()=>setShowNewList(true) }:undefined}
              />
            )}

            {filteredLists.map(list => {
              const t = LIST_TYPES.find(x => x.type === list.type) ?? LIST_TYPES[1]
              const Icon = t.icon
              const isPrivate = list.visibility === 'private'
              return (
                <button key={list.id} onClick={() => setSelected(list)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 16px', borderRadius: 20, marginBottom: 8,
                  background: 'var(--ht-glass-warm)',
                  backdropFilter: 'blur(12px)',
                  border: `1px solid ${isPrivate ? 'rgba(124,58,237,0.15)' : 'var(--ht-glass-border)'}`,
                  cursor: 'pointer', textAlign: 'left',
                  boxShadow: 'var(--ht-shadow-card)',
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 9999,
                    background: t.light, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    border: `1px solid ${t.color}25`,
                  }}>
                    <Icon size={18} color={t.color} strokeWidth={2.2} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <p style={{ fontWeight: 800, fontSize: 15 }}>{list.name}</p>
                      {isPrivate && <Lock size={12} color="var(--ht-text-4)" />}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--ht-text-3)', fontWeight: 500 }}>
                      {t.label} · {isPrivate ? 'Solo vos' : 'Compartida'}
                    </p>
                  </div>
                  <ChevronRight size={16} color="var(--ht-text-4)" />
                </button>
              )
            })}
          </>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                className="ht-input"
                placeholder={selected.type === 'shopping' ? 'Agregar producto...' : 'Agregar ítem...'}
                value={newItemText}
                onChange={e => setNewItemText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addItem()}
                autoFocus
              />
              <button onClick={addItem} disabled={!newItemText.trim()} className="ht-btn ht-btn-primary" style={{ flexShrink: 0, padding: '11px 16px' }}>
                <Plus size={16} />
              </button>
            </div>

            {pending.map(item => (
              <div key={item.id} className="ht-list-item">
                <button onClick={() => toggleItem(item.id, item.completed)} className="ht-checkbox" />
                <span style={{ flex: 1, fontSize: 15, fontWeight: 500 }}>{item.title}</span>
                <button onClick={() => deleteItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ht-text-4)', padding: 4 }}>
                  <X size={15} />
                </button>
              </div>
            ))}

            {done.length > 0 && (
              <>
                <p className="ht-section-label" style={{ marginTop: 16 }}>Completados ({done.length})</p>
                {done.map(item => (
                  <div key={item.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 16, marginBottom: 5,
                    background: 'rgba(4,120,87,0.07)', border: '1px solid rgba(4,120,87,0.12)',
                  }}>
                    <button onClick={() => toggleItem(item.id, item.completed)} className="ht-checkbox checked">
                      <Check size={12} color="white" strokeWidth={3} />
                    </button>
                    <span style={{ flex: 1, fontSize: 14, textDecoration: 'line-through', color: 'var(--ht-text-3)', fontWeight: 500 }}>{item.title}</span>
                    <button onClick={() => deleteItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ht-text-4)', padding: 4 }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </>
            )}

            {items.length === 0 && (
              <EmptyState type="list" />
            )}

            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <button onClick={() => deleteList(selected.id)} className="ht-btn ht-btn-danger" style={{ fontSize: 13 }}>
                <Trash2 size={13} /> Eliminar lista
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modal nueva lista */}
      {showNewList && (
        <>
          <div className="ht-overlay" onClick={() => setShowNewList(false)} />
          <div className="ht-modal">
            <div style={{ padding: '20px 16px 0' }}>
              <div style={{ width: 36, height: 4, background: 'rgba(124,58,237,0.2)', borderRadius: 9999, margin: '0 auto 16px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 17, fontWeight: 800 }}>Nueva lista</h2>
                <button onClick={() => setShowNewList(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ht-text-3)', padding: 4 }}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <div style={{ padding: '0 16px 32px' }}>
              {/* Tipo */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
                {LIST_TYPES.map(({ type, icon: Icon, label, color, light }) => (
                  <button key={type} onClick={() => setNewListType(type)} style={{
                    padding: '14px 8px', borderRadius: 16, border: '1.5px solid',
                    borderColor: newListType === type ? color : 'var(--ht-glass-border)',
                    background: newListType === type ? light : 'var(--ht-glass-warm)',
                    cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    transition: 'all 0.15s',
                  }}>
                    <Icon size={20} color={newListType === type ? color : 'var(--ht-text-4)'} strokeWidth={2} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: newListType === type ? color : 'var(--ht-text-3)' }}>{label}</span>
                  </button>
                ))}
              </div>

              {/* Nombre */}
              <input
                className="ht-input"
                placeholder="Nombre de la lista"
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createList()}
                style={{ marginBottom: 12 }}
                autoFocus
              />

              {/* Privacidad */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
                {([
                  { v: 'shared'  as const, icon: Globe, label: 'Compartida', desc: 'Todos del hogar la ven', color: 'var(--ht-mint)' },
                  { v: 'private' as const, icon: Lock,  label: 'Privada',     desc: 'Solo la ves vos',      color: 'var(--ht-purple)' },
                ]).map(({ v, icon: Icon, label, desc, color }) => (
                  <button key={v} onClick={() => setNewListVisibility(v)} style={{
                    padding: '12px', borderRadius: 14, border: '1.5px solid',
                    borderColor: newListVisibility === v ? color : 'var(--ht-glass-border)',
                    background: newListVisibility === v ? `${color}12` : 'var(--ht-glass-warm)',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                  }}>
                    <Icon size={16} color={newListVisibility === v ? color : 'var(--ht-text-4)'} style={{ marginBottom: 4 }} />
                    <p style={{ fontSize: 13, fontWeight: 700, color: newListVisibility === v ? color : 'var(--ht-text)' }}>{label}</p>
                    <p style={{ fontSize: 11, color: 'var(--ht-text-3)', marginTop: 2 }}>{desc}</p>
                  </button>
                ))}
              </div>

              <button onClick={createList} disabled={!newListName.trim()} className="ht-btn ht-btn-primary" style={{ width: '100%' }}>
                Crear lista
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
