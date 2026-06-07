'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { TaskList, TaskItem } from '@/lib/types'
import { Plus, X, Check, ShoppingCart, ClipboardList, Sparkles, Trash2, ChevronRight } from 'lucide-react'

export default function TasksPage() {
  const { user, household } = useAuth()
  const supabase = createClient()
  const [lists, setLists] = useState<TaskList[]>([])
  const [selectedList, setSelectedList] = useState<TaskList | null>(null)
  const [items, setItems] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewList, setShowNewList] = useState(false)
  const [newItemText, setNewItemText] = useState('')
  const [newListName, setNewListName] = useState('')
  const [newListType, setNewListType] = useState<TaskList['type']>('todo')
  const [addingItem, setAddingItem] = useState(false)

  useEffect(() => {
    if (household) loadLists()
  }, [household])

  useEffect(() => {
    if (selectedList) loadItems(selectedList.id)
  }, [selectedList])

  async function loadLists() {
    const { data } = await supabase
      .from('task_lists')
      .select('*')
      .eq('household_id', household!.id)
      .order('created_at')
    setLists(data ?? [])
    setLoading(false)
  }

  async function loadItems(listId: string) {
    const { data } = await supabase
      .from('task_items')
      .select('*, completer:completed_by(name, avatar_url)')
      .eq('list_id', listId)
      .order('sort_order')
      .order('created_at')
    setItems(data ?? [])
  }

  async function createList() {
    if (!newListName.trim()) return
    const typeIcons = { shopping: '🛒', todo: '📋', custom: '✨' }
    const typeColors = { shopping: '#10b981', todo: '#7c3aed', custom: '#ec4899' }
    const { data } = await supabase
      .from('task_lists')
      .insert({
        household_id: household!.id,
        name: newListName.trim(),
        type: newListType,
        icon: typeIcons[newListType],
        color: typeColors[newListType],
        created_by: user!.id,
      })
      .select()
      .single()
    if (data) {
      setLists(prev => [...prev, data])
      setSelectedList(data)
      setShowNewList(false)
      setNewListName('')
    }
  }

  async function addItem() {
    if (!newItemText.trim() || !selectedList) return
    setAddingItem(true)
    const { data } = await supabase
      .from('task_items')
      .insert({
        list_id: selectedList.id,
        title: newItemText.trim(),
        completed: false,
        created_by: user!.id,
        sort_order: items.length,
      })
      .select()
      .single()
    if (data) {
      setItems(prev => [...prev, data])
      setNewItemText('')
    }
    setAddingItem(false)
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
    if (selectedList?.id === id) setSelectedList(null)
  }

  const TypeIcon = ({ type }: { type: TaskList['type'] }) => {
    if (type === 'shopping') return <ShoppingCart size={18} />
    if (type === 'todo') return <ClipboardList size={18} />
    return <Sparkles size={18} />
  }

  const pendingCount = items.filter(i => !i.completed).length
  const doneCount = items.filter(i => i.completed).length

  return (
    <div>
      <div className="ht-header-gradient" style={{ paddingBottom: 28 }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: 22, fontWeight: 800 }}>
              {selectedList ? selectedList.name : 'Listas'}
            </h1>
            {selectedList ? (
              <button onClick={() => { setSelectedList(null); setItems([]) }} style={{
                background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 10,
                color: 'white', padding: '6px 10px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              }}>
                ← Volver
              </button>
            ) : (
              <button onClick={() => setShowNewList(true)} style={{
                background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 10,
                color: 'white', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <Plus size={15} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>Nueva Lista</span>
              </button>
            )}
          </div>
          {selectedList && (
            <p style={{ opacity: 0.75, fontSize: 14, marginTop: 4 }}>
              {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''} · {doneCount} completado{doneCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      <div className="ht-page" style={{ marginTop: 12 }}>
        {!selectedList ? (
          /* Lists overview */
          <>
            {loading && <div style={{ color: 'var(--ht-text-3)', textAlign: 'center', padding: 40 }}>Cargando...</div>}
            {!loading && lists.length === 0 && (
              <div className="ht-empty">
                <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                <p style={{ fontWeight: 700, marginBottom: 4 }}>Sin listas aún</p>
                <p style={{ fontSize: 14 }}>Creá una lista de compras o pendientes</p>
                <button onClick={() => setShowNewList(true)} className="ht-btn ht-btn-primary" style={{ marginTop: 16 }}>
                  <Plus size={16} /> Nueva Lista
                </button>
              </div>
            )}
            {lists.map(list => {
              return (
                <button
                  key={list.id}
                  onClick={() => setSelectedList(list)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px', borderRadius: 14, marginBottom: 10,
                    background: 'white', border: 'none', cursor: 'pointer',
                    boxShadow: 'var(--ht-shadow)', textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: list.color + '20',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, flexShrink: 0,
                  }}>
                    {list.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{list.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ht-text-3)', textTransform: 'capitalize' }}>
                      {list.type === 'shopping' ? 'Lista de compras' : list.type === 'todo' ? 'Lista de tareas' : 'Lista personalizada'}
                    </div>
                  </div>
                  <ChevronRight size={18} color="var(--ht-text-3)" />
                </button>
              )
            })}
          </>
        ) : (
          /* List detail */
          <>
            {/* Add item input */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                className="ht-input"
                placeholder={selectedList.type === 'shopping' ? 'Agregar producto...' : 'Agregar tarea...'}
                value={newItemText}
                onChange={e => setNewItemText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addItem()}
              />
              <button
                onClick={addItem}
                disabled={addingItem || !newItemText.trim()}
                className="ht-btn ht-btn-primary"
                style={{ flexShrink: 0 }}
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Items */}
            {items.filter(i => !i.completed).map(item => (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 12, marginBottom: 8,
                background: 'white', boxShadow: 'var(--ht-shadow)',
              }}>
                <button onClick={() => toggleItem(item.id, item.completed)} className="ht-checkbox">
                  {item.completed && <Check size={14} color="white" strokeWidth={3} />}
                </button>
                <span style={{ flex: 1, fontSize: 15 }}>{item.title}</span>
                <button
                  onClick={() => deleteItem(item.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ht-text-3)', padding: 4 }}
                >
                  <X size={16} />
                </button>
              </div>
            ))}

            {/* Done items */}
            {doneCount > 0 && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ht-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '16px 0 8px' }}>
                  Completados ({doneCount})
                </div>
                {items.filter(i => i.completed).map(item => (
                  <div key={item.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 12, marginBottom: 6,
                    background: 'var(--ht-green-light)',
                  }}>
                    <button
                      onClick={() => toggleItem(item.id, item.completed)}
                      className="ht-checkbox checked"
                    >
                      <Check size={14} color="white" strokeWidth={3} />
                    </button>
                    <span style={{ flex: 1, fontSize: 14, textDecoration: 'line-through', color: 'var(--ht-text-3)' }}>
                      {item.title}
                    </span>
                    <button
                      onClick={() => deleteItem(item.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ht-text-3)', padding: 4 }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </>
            )}

            {items.length === 0 && (
              <div className="ht-empty">
                <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
                <p>Agregá el primer ítem arriba</p>
              </div>
            )}

            {/* Delete list */}
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <button
                onClick={() => deleteList(selectedList.id)}
                className="ht-btn ht-btn-danger"
                style={{ fontSize: 13 }}
              >
                <Trash2 size={14} /> Eliminar lista
              </button>
            </div>
          </>
        )}
      </div>

      {/* New list modal */}
      {showNewList && (
        <>
          <div className="ht-overlay" onClick={() => setShowNewList(false)} />
          <div className="ht-modal">
            <div style={{ padding: '20px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>Nueva Lista</h2>
              <button onClick={() => setShowNewList(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ht-text-3)' }}>
                <X size={22} />
              </button>
            </div>

            <div style={{ padding: '0 16px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
                {([
                  { type: 'shopping', icon: '🛒', label: 'Compras', color: '#10b981' },
                  { type: 'todo', icon: '📋', label: 'Pendientes', color: '#7c3aed' },
                  { type: 'custom', icon: '✨', label: 'Personalizada', color: '#ec4899' },
                ] as const).map(opt => (
                  <button
                    key={opt.type}
                    onClick={() => setNewListType(opt.type)}
                    style={{
                      padding: '14px 8px', borderRadius: 12, border: '2px solid',
                      borderColor: newListType === opt.type ? opt.color : 'var(--ht-line)',
                      background: newListType === opt.type ? opt.color + '15' : 'white',
                      cursor: 'pointer', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 24 }}>{opt.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: newListType === opt.type ? opt.color : 'var(--ht-text-3)' }}>
                      {opt.label}
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

              <button
                onClick={createList}
                disabled={!newListName.trim()}
                className="ht-btn ht-btn-primary"
                style={{ width: '100%' }}
              >
                Crear Lista
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
