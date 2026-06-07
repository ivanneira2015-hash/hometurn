'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { TaskList, TaskItem } from '@/lib/types'
import { Plus, X, Check, ShoppingCart, ClipboardList, Sparkles, Trash2, ChevronRight } from 'lucide-react'

const LIST_TYPES = [
  { type: 'shopping' as const, icon: ShoppingCart, label: 'Compras', color: '#10b981', light: '#d1fae5' },
  { type: 'todo' as const, icon: ClipboardList, label: 'Pendientes', color: '#6366f1', light: '#eef2ff' },
  { type: 'custom' as const, icon: Sparkles, label: 'Personalizada', color: '#f97316', light: '#fff7ed' },
]

export default function TasksPage() {
  const { user, household } = useAuth()
  const supabase = createClient()
  const [lists, setLists] = useState<TaskList[]>([])
  const [selected, setSelected] = useState<TaskList | null>(null)
  const [items, setItems] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewList, setShowNewList] = useState(false)
  const [newItemText, setNewItemText] = useState('')
  const [newListName, setNewListName] = useState('')
  const [newListType, setNewListType] = useState<TaskList['type']>('todo')

  useEffect(() => { if (household) loadLists() }, [household])
  useEffect(() => { if (selected) loadItems(selected.id) }, [selected])

  async function loadLists() {
    const { data } = await supabase.from('task_lists').select('*').eq('household_id', household!.id).order('created_at')
    setLists(data ?? [])
    setLoading(false)
  }

  async function loadItems(listId: string) {
    const { data } = await supabase.from('task_items').select('*').eq('list_id', listId).order('sort_order').order('created_at')
    setItems(data ?? [])
  }

  async function createList() {
    if (!newListName.trim()) return
    const t = LIST_TYPES.find(x => x.type === newListType)!
    const { data } = await supabase.from('task_lists').insert({
      household_id: household!.id, name: newListName.trim(),
      type: newListType, icon: '•', color: t.color, created_by: user!.id,
    }).select().single()
    if (data) { setLists(prev => [...prev, data]); setSelected(data); setShowNewList(false); setNewListName('') }
  }

  async function addItem() {
    if (!newItemText.trim() || !selected) return
    const { data } = await supabase.from('task_items').insert({
      list_id: selected.id, title: newItemText.trim(), completed: false,
      created_by: user!.id, sort_order: items.length,
    }).select().single()
    if (data) { setItems(prev => [...prev, data]); setNewItemText('') }
  }

  async function toggleItem(id: string, current: boolean) {
    const update = current
      ? { completed: false, completed_by: null, completed_at: null }
      : { completed: true, completed_by: user!.id, completed_at: new Date().toISOString() }
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
  const currentType = LIST_TYPES.find(t => t.type === selected?.type)

  return (
    <div>
      <div className="ht-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {selected ? (
              <>
                <button onClick={() => { setSelected(null); setItems([]) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--ht-indigo)', fontWeight: 600, padding: 0, marginBottom: 4 }}>
                  ← Volver
                </button>
                <h1 style={{ fontSize: 20, fontWeight: 800 }}>{selected.name}</h1>
                <p style={{ fontSize: 13, color: 'var(--ht-text-3)', marginTop: 2 }}>
                  {pending.length} pendiente{pending.length !== 1 ? 's' : ''} · {done.length} completado{done.length !== 1 ? 's' : ''}
                </p>
              </>
            ) : (
              <h1 style={{ fontSize: 20, fontWeight: 800 }}>Listas</h1>
            )}
          </div>
          {!selected && (
            <button onClick={() => setShowNewList(true)} className="ht-btn ht-btn-primary" style={{ padding: '7px 12px', fontSize: 13 }}>
              <Plus size={14} /> Nueva lista
            </button>
          )}
        </div>
      </div>

      <div className="ht-page" style={{ paddingTop: 16 }}>
        {!selected ? (
          <>
            {loading && <div style={{ color: 'var(--ht-text-3)', textAlign: 'center', padding: 40, fontSize: 14 }}>Cargando...</div>}
            {!loading && lists.length === 0 && (
              <div className="ht-empty">
                <p style={{ fontWeight: 700, marginBottom: 4, fontSize: 16 }}>Sin listas</p>
                <p style={{ fontSize: 14 }}>Creá una lista de compras o tareas pendientes</p>
                <button onClick={() => setShowNewList(true)} className="ht-btn ht-btn-primary" style={{ marginTop: 16 }}>
                  <Plus size={14} /> Nueva lista
                </button>
              </div>
            )}
            {lists.map(list => {
              const t = LIST_TYPES.find(x => x.type === list.type) ?? LIST_TYPES[1]
              const Icon = t.icon
              return (
                <button key={list.id} onClick={() => setSelected(list)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 16px', borderRadius: 12, marginBottom: 8,
                  background: 'var(--ht-surface)', border: '1px solid var(--ht-line)',
                  cursor: 'pointer', textAlign: 'left',
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: t.light, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon size={18} color={t.color} strokeWidth={2} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: 15 }}>{list.name}</p>
                    <p style={{ fontSize: 12, color: 'var(--ht-text-3)' }}>
                      {t.label}
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
              <button onClick={addItem} disabled={!newItemText.trim()} className="ht-btn ht-btn-primary" style={{ flexShrink: 0 }}>
                <Plus size={16} />
              </button>
            </div>

            {pending.map(item => (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 14px', borderRadius: 10, marginBottom: 6,
                background: 'var(--ht-surface)', border: '1px solid var(--ht-line)',
              }}>
                <button onClick={() => toggleItem(item.id, item.completed)} className="ht-checkbox" />
                <span style={{ flex: 1, fontSize: 15 }}>{item.title}</span>
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
                    padding: '10px 14px', borderRadius: 10, marginBottom: 5,
                    background: 'var(--ht-green-light)', border: '1px solid #a7f3d0',
                  }}>
                    <button onClick={() => toggleItem(item.id, item.completed)} className="ht-checkbox checked">
                      <Check size={12} color="white" strokeWidth={3} />
                    </button>
                    <span style={{ flex: 1, fontSize: 14, textDecoration: 'line-through', color: 'var(--ht-text-3)' }}>{item.title}</span>
                    <button onClick={() => deleteItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ht-text-4)', padding: 4 }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </>
            )}

            {items.length === 0 && (
              <div className="ht-empty">
                <p style={{ fontSize: 14 }}>Agregá el primer ítem arriba</p>
              </div>
            )}

            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <button onClick={() => deleteList(selected.id)} className="ht-btn ht-btn-danger" style={{ fontSize: 13 }}>
                <Trash2 size={13} /> Eliminar lista
              </button>
            </div>
          </>
        )}
      </div>

      {showNewList && (
        <>
          <div className="ht-overlay" onClick={() => setShowNewList(false)} />
          <div className="ht-modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 16px 12px', borderBottom: '1px solid var(--ht-line)' }}>
              <h2 style={{ fontSize: 17, fontWeight: 800 }}>Nueva lista</h2>
              <button onClick={() => setShowNewList(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ht-text-3)', padding: 4 }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '16px 16px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
                {LIST_TYPES.map(({ type, icon: Icon, label, color, light }) => (
                  <button key={type} onClick={() => setNewListType(type)} style={{
                    padding: '14px 8px', borderRadius: 10, border: '1.5px solid',
                    borderColor: newListType === type ? color : 'var(--ht-line)',
                    background: newListType === type ? light : 'var(--ht-surface)',
                    cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  }}>
                    <Icon size={20} color={newListType === type ? color : 'var(--ht-text-4)'} strokeWidth={2} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: newListType === type ? color : 'var(--ht-text-3)' }}>
                      {label}
                    </span>
                  </button>
                ))}
              </div>
              <input
                className="ht-input"
                placeholder="Nombre de la lista"
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createList()}
                style={{ marginBottom: 12 }}
                autoFocus
              />
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
