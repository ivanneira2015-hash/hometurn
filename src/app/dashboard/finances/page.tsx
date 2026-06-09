'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Transaction, ExpenseCategory, Budget } from '@/lib/types'
import {
  TrendingUp, Plus, ArrowUpCircle, ArrowDownCircle,
  X, Check, Trash2, Lock, Globe, Settings, Edit2, Target, FileSpreadsheet
} from 'lucide-react'
import ImportExcelModal from '@/components/ImportExcelModal'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const DEFAULT_CATEGORIES = [
  { name: 'Comida',          icon: '🍕', color: '#f43f5e', type: 'expense' },
  { name: 'Transporte',      icon: '🚗', color: '#f59e0b', type: 'expense' },
  { name: 'Hogar',           icon: '🏠', color: '#7c3aed', type: 'expense' },
  { name: 'Salud',           icon: '💊', color: '#10b981', type: 'expense' },
  { name: 'Entretenimiento', icon: '🎬', color: '#3b82f6', type: 'expense' },
  { name: 'Ropa',            icon: '👕', color: '#ec4899', type: 'expense' },
  { name: 'Educación',       icon: '📚', color: '#8b5cf6', type: 'expense' },
  { name: 'Sueldo',          icon: '💼', color: '#10b981', type: 'income'  },
  { name: 'Otros ingresos',  icon: '💰', color: '#f59e0b', type: 'income'  },
  { name: 'Otros gastos',    icon: '📦', color: '#6b7280', type: 'expense' },
] as const

type Tab = 'resumen' | 'movimientos' | 'presupuestos'

const MONTHS_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)

export default function FinancesPage() {
  const { user, profile, household, members } = useAuth()
  const supabase = createClient()

  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [tab, setTab]     = useState<Tab>('resumen')

  const [categories,   setCategories]   = useState<ExpenseCategory[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets,      setBudgets]      = useState<Budget[]>([])

  // Filters
  const [filterType,   setFilterType]   = useState<'all'|'income'|'expense'>('all')
  const [filterCat,    setFilterCat]    = useState<string>('all')
  const [filterMember, setFilterMember] = useState<string>('all')

  // Add/edit transaction modal
  const [editTx,    setEditTx]    = useState<Transaction | null>(null)
  const [showAdd,   setShowAdd]   = useState(false)
  const [addType,   setAddType]   = useState<'income'|'expense'>('expense')
  const [addAmount, setAddAmount] = useState('')
  const [addCat,    setAddCat]    = useState('')
  const [addDesc,   setAddDesc]   = useState('')
  const [addDate,   setAddDate]   = useState(new Date().toISOString().split('T')[0])
  const [addVisib,  setAddVisib]  = useState<'shared'|'private'>('shared')
  const [saving,    setSaving]    = useState(false)

  // Budget modal
  const [budgetModal, setBudgetModal] = useState<ExpenseCategory | null>(null)
  const [budgetAmt,   setBudgetAmt]   = useState('')
  const [savingBudget, setSavingBudget] = useState(false)

  // Settings modal
  const [showSettings, setShowSettings] = useState(false)
  const [showImport,   setShowImport]   = useState(false)
  const [newCatName,   setNewCatName]   = useState('')
  const [newCatIcon,   setNewCatIcon]   = useState('📦')
  const [newCatType,   setNewCatType]   = useState<'income'|'expense'>('expense')

  useEffect(() => { if (household) initFinances() }, [household])

  const loadData = useCallback(async () => {
    if (!household) return
    const startDate = `${year}-${String(month+1).padStart(2,'0')}-01`
    const endDate   = new Date(year, month+1, 0).toISOString().split('T')[0]
    const [{ data: txs }, { data: buds }] = await Promise.all([
      supabase.from('transactions')
        .select('*, category:expense_categories(*), profile:profiles(id,name,avatar_url)')
        .eq('household_id', household.id)
        .gte('date', startDate).lte('date', endDate)
        .or(`visibility.eq.shared,profile_id.eq.${user!.id}`)
        .order('date', { ascending: false }),
      supabase.from('budgets').select('*, category:expense_categories(*)').eq('household_id', household.id),
    ])
    setTransactions(txs ?? [])
    setBudgets(buds ?? [])
  }, [household, year, month])

  useEffect(() => { loadData() }, [loadData])

  async function initFinances() {
    const { data: cats } = await supabase.from('expense_categories').select('*').eq('household_id', household!.id).order('name')
    if (!cats || cats.length === 0) {
      const { data: seeded } = await supabase.from('expense_categories').insert(DEFAULT_CATEGORIES.map(c => ({ ...c, household_id: household!.id }))).select()
      setCategories(seeded ?? [])
    } else { setCategories(cats) }
  }

  function openAdd(tx?: Transaction) {
    if (tx) {
      setEditTx(tx)
      setAddType(tx.type)
      setAddAmount(String(tx.amount))
      setAddCat(tx.category_id ?? '')
      setAddDesc(tx.description ?? '')
      setAddDate(tx.date)
      setAddVisib(tx.visibility)
    } else {
      setEditTx(null)
      setAddType('expense')
      setAddAmount('')
      setAddCat('')
      setAddDesc('')
      setAddDate(new Date().toISOString().split('T')[0])
      setAddVisib('shared')
    }
    setShowAdd(true)
  }

  async function saveTransaction() {
    if (!addAmount || !household || !profile) return
    setSaving(true)
    const payload = {
      household_id: household.id, profile_id: profile.id,
      category_id: addCat || null,
      amount: parseFloat(addAmount.replace(',','.')),
      type: addType, description: addDesc.trim() || null,
      date: addDate, visibility: addVisib,
    }
    if (editTx) {
      await supabase.from('transactions').update(payload).eq('id', editTx.id)
    } else {
      await supabase.from('transactions').insert(payload)
    }
    setSaving(false); setShowAdd(false); setEditTx(null)
    await loadData()
  }

  async function deleteTx(id: string) {
    await supabase.from('transactions').delete().eq('id', id)
    setTransactions(prev => prev.filter(t => t.id !== id))
  }

  async function saveBudget() {
    if (!budgetAmt || !budgetModal || !household) return
    setSavingBudget(true)
    const existing = budgets.find(b => b.category_id === budgetModal.id)
    if (existing) {
      await supabase.from('budgets').update({ amount: parseFloat(budgetAmt) }).eq('id', existing.id)
    } else {
      await supabase.from('budgets').insert({ household_id: household.id, category_id: budgetModal.id, amount: parseFloat(budgetAmt), period: 'monthly' })
    }
    await loadData()
    setSavingBudget(false); setBudgetModal(null); setBudgetAmt('')
  }

  async function deleteBudget(catId: string) {
    const b = budgets.find(b => b.category_id === catId)
    if (!b) return
    await supabase.from('budgets').delete().eq('id', b.id)
    setBudgets(prev => prev.filter(x => x.id !== b.id))
  }

  async function addCategory() {
    if (!newCatName.trim() || !household) return
    const color = ['#f43f5e','#f59e0b','#7c3aed','#10b981','#3b82f6','#ec4899'][Math.floor(Math.random()*6)]
    const { data } = await supabase.from('expense_categories').insert({ household_id: household.id, name: newCatName.trim(), icon: newCatIcon, color, type: newCatType }).select().single()
    if (data) { setCategories(prev => [...prev, data]); setNewCatName('') }
  }

  async function deleteCategory(id: string) {
    await supabase.from('expense_categories').delete().eq('id', id)
    setCategories(prev => prev.filter(c => c.id !== id))
  }

  // Computed
  const income   = transactions.filter(t => t.type === 'income').reduce((s,t)  => s + Number(t.amount), 0)
  const expense  = transactions.filter(t => t.type === 'expense').reduce((s,t) => s + Number(t.amount), 0)
  const balance  = income - expense

  const pieData = categories
    .map(cat => ({ name: cat.name, value: transactions.filter(t => t.type==='expense' && t.category_id===cat.id).reduce((s,t)=>s+Number(t.amount),0), color: cat.color, icon: cat.icon }))
    .filter(d => d.value > 0).sort((a,b) => b.value - a.value)

  const filteredTx = transactions.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false
    if (filterCat !== 'all' && t.category_id !== filterCat) return false
    if (filterMember !== 'all' && t.profile_id !== filterMember) return false
    return true
  })

  const txByDay = filteredTx.reduce((acc, t) => {
    const d = new Date(t.date+'T12:00:00').toLocaleDateString('es-AR', { weekday:'short', day:'numeric', month:'short' })
    if (!acc[d]) acc[d] = []
    acc[d].push(t); return acc
  }, {} as Record<string, Transaction[]>)

  const filteredCats = categories.filter(c => c.type === addType || c.type === 'both')

  const prevMonth = () => { if (month===0) { setMonth(11); setYear(y=>y-1) } else setMonth(m=>m-1) }
  const nextMonth = () => {
    const nm = month===11 ? 0 : month+1; const ny = month===11 ? year+1 : year
    if (ny > now.getFullYear() || (ny===now.getFullYear()&&nm>now.getMonth())) return
    setMonth(nm); if (month===11) setYear(y=>y+1)
  }

  return (
    <div>
      {/* Header */}
      <div className="ht-page-header">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:9999, background:'linear-gradient(135deg,#10b981,#34d399)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 3px 10px rgba(16,185,129,0.35)' }}>
              <TrendingUp size={16} color="white" strokeWidth={2.5} />
            </div>
            <h1 style={{ fontSize:20, fontWeight:800 }}>Finanzas</h1>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setShowImport(true)} style={{ background:'rgba(16,185,129,0.08)', border:'none', borderRadius:9999, padding:'7px 10px', cursor:'pointer', color:'var(--ht-mint)' }}>
              <FileSpreadsheet size={15} />
            </button>
            <button onClick={() => setShowSettings(true)} style={{ background:'rgba(124,58,237,0.08)', border:'none', borderRadius:9999, padding:'7px 10px', cursor:'pointer', color:'var(--ht-purple)' }}>
              <Settings size={15} />
            </button>
            <button onClick={() => openAdd()} className="ht-btn ht-btn-primary" style={{ padding:'7px 14px', fontSize:13 }}>
              <Plus size={14} /> Agregar
            </button>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <button onClick={prevMonth} style={{ background:'rgba(124,58,237,0.08)', border:'none', borderRadius:9999, padding:'6px 12px', cursor:'pointer', color:'var(--ht-purple)', fontWeight:700, fontSize:15 }}>‹</button>
          <span style={{ fontWeight:800, fontSize:15 }}>{MONTHS_FULL[month]} {year}</span>
          <button onClick={nextMonth} style={{ background:'rgba(124,58,237,0.08)', border:'none', borderRadius:9999, padding:'6px 12px', cursor:'pointer', color:'var(--ht-purple)', fontWeight:700, fontSize:15 }}>›</button>
        </div>
      </div>

      <div className="ht-page" style={{ paddingTop:16 }}>

        {/* Balance cards */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
          <div className="ht-card" style={{ background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', padding:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:5 }}>
              <ArrowUpCircle size={13} color="#10b981" />
              <span style={{ fontSize:10, fontWeight:700, color:'var(--ht-text-3)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Ingresos</span>
            </div>
            <p style={{ fontSize:20, fontWeight:900, color:'#10b981', letterSpacing:'-0.02em' }}>{fmt(income)}</p>
          </div>
          <div className="ht-card" style={{ background:'rgba(244,63,94,0.08)', border:'1px solid rgba(244,63,94,0.2)', padding:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:5 }}>
              <ArrowDownCircle size={13} color="#f43f5e" />
              <span style={{ fontSize:10, fontWeight:700, color:'var(--ht-text-3)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Gastos</span>
            </div>
            <p style={{ fontSize:20, fontWeight:900, color:'#f43f5e', letterSpacing:'-0.02em' }}>{fmt(expense)}</p>
          </div>
        </div>

        <div className="ht-card" style={{ marginBottom:16, padding:'12px 16px', background:balance>=0?'rgba(16,185,129,0.06)':'rgba(244,63,94,0.06)', border:`1px solid ${balance>=0?'rgba(16,185,129,0.2)':'rgba(244,63,94,0.2)'}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontWeight:700, fontSize:13, color:'var(--ht-text-3)' }}>Balance del mes</span>
          <span style={{ fontWeight:900, fontSize:20, letterSpacing:'-0.02em', color:balance>=0?'#10b981':'#f43f5e' }}>{balance>=0?'+':''}{fmt(balance)}</span>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:6, marginBottom:16, background:'rgba(124,58,237,0.06)', padding:4, borderRadius:9999 }}>
          {(['resumen','movimientos','presupuestos'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex:1, padding:'8px', borderRadius:9999, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, background:tab===t?'white':'transparent', color:tab===t?'var(--ht-purple)':'var(--ht-text-3)', boxShadow:tab===t?'0 2px 8px rgba(124,58,237,0.1)':'none', transition:'all 0.15s', textTransform:'capitalize' }}>
              {t === 'presupuestos' ? 'Metas' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* ── RESUMEN ── */}
        {tab === 'resumen' && (
          pieData.length === 0
            ? <div className="ht-card" style={{ textAlign:'center', padding:'32px 20px' }}>
                <TrendingUp size={28} color="rgba(16,185,129,0.4)" style={{ margin:'0 auto 10px', display:'block' }} />
                <p style={{ fontWeight:700, fontSize:15, marginBottom:6 }}>Sin movimientos este mes</p>
                <p style={{ fontSize:13, color:'var(--ht-text-3)' }}>Agregá tu primer gasto o ingreso</p>
                <button onClick={() => openAdd()} className="ht-btn ht-btn-primary" style={{ marginTop:16 }}><Plus size={14} /> Agregar</button>
              </div>
            : <div className="ht-card" style={{ padding:'16px 12px' }}>
                <p style={{ fontWeight:800, fontSize:14, marginBottom:12 }}>Gastos por categoría</p>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                      {pieData.map((e,i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => fmt(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:12 }}>
                  {pieData.map(d => (
                    <div key={d.name} style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:10, height:10, borderRadius:9999, background:d.color, flexShrink:0 }} />
                      <span style={{ flex:1, fontSize:13, fontWeight:600 }}>{d.icon} {d.name}</span>
                      <span style={{ fontSize:13, fontWeight:800, color:d.color }}>{fmt(d.value)}</span>
                      {expense>0 && <span style={{ fontSize:11, color:'var(--ht-text-4)', minWidth:32, textAlign:'right' }}>{Math.round((d.value/expense)*100)}%</span>}
                    </div>
                  ))}
                </div>
              </div>
        )}

        {/* ── MOVIMIENTOS ── */}
        {tab === 'movimientos' && (
          <>
            {/* Filters */}
            <div style={{ display:'flex', gap:6, marginBottom:14, overflowX:'auto', paddingBottom:4 }}>
              {/* Type */}
              {(['all','expense','income'] as const).map(f => (
                <button key={f} onClick={() => setFilterType(f)} style={{ padding:'5px 12px', borderRadius:9999, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, flexShrink:0, background:filterType===f?'var(--ht-purple)':'rgba(124,58,237,0.08)', color:filterType===f?'white':'var(--ht-purple)', transition:'all 0.15s' }}>
                  {f==='all'?'Todos':f==='expense'?'Gastos':'Ingresos'}
                </button>
              ))}
              <div style={{ width:1, background:'var(--ht-glass-border)', flexShrink:0 }} />
              {/* Category filter */}
              <button onClick={() => setFilterCat('all')} style={{ padding:'5px 12px', borderRadius:9999, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, flexShrink:0, background:filterCat==='all'?'rgba(124,58,237,0.15)':'rgba(0,0,0,0.04)', color:'var(--ht-text-3)', transition:'all 0.15s' }}>
                Todas
              </button>
              {categories.filter(c => transactions.some(t => t.category_id===c.id)).map(cat => (
                <button key={cat.id} onClick={() => setFilterCat(filterCat===cat.id?'all':cat.id)} style={{ padding:'5px 12px', borderRadius:9999, border:`1.5px solid ${filterCat===cat.id?cat.color:'transparent'}`, cursor:'pointer', fontSize:12, fontWeight:700, flexShrink:0, background:filterCat===cat.id?`${cat.color}15`:'rgba(0,0,0,0.04)', color:filterCat===cat.id?cat.color:'var(--ht-text-3)', transition:'all 0.15s' }}>
                  {cat.icon} {cat.name}
                </button>
              ))}
              {members.length > 1 && (
                <>
                  <div style={{ width:1, background:'var(--ht-glass-border)', flexShrink:0 }} />
                  {members.map(m => (
                    <button key={m.profile_id} onClick={() => setFilterMember(filterMember===m.profile_id?'all':m.profile_id)} style={{ padding:'5px 12px', borderRadius:9999, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, flexShrink:0, background:filterMember===m.profile_id?'rgba(124,58,237,0.15)':'rgba(0,0,0,0.04)', color:'var(--ht-text-3)', transition:'all 0.15s' }}>
                      {m.profile?.name?.split(' ')[0]}
                    </button>
                  ))}
                </>
              )}
            </div>

            {filteredTx.length === 0
              ? <div className="ht-card" style={{ textAlign:'center', padding:'28px 20px' }}>
                  <p style={{ fontWeight:700, fontSize:15, marginBottom:6 }}>Sin movimientos</p>
                  <p style={{ fontSize:13, color:'var(--ht-text-3)' }}>{filterType!=='all'||filterCat!=='all'?'Probá cambiando los filtros':'Agregá tu primer movimiento del mes'}</p>
                </div>
              : Object.entries(txByDay).map(([day, list]) => (
                  <div key={day} style={{ marginBottom:16 }}>
                    <p className="ht-section-label">{day}</p>
                    {list.map(tx => (
                      <div key={tx.id} className="ht-list-item" style={{ marginBottom:6 }}>
                        <div style={{ width:38, height:38, borderRadius:9999, flexShrink:0, background:tx.type==='income'?'rgba(16,185,129,0.12)':`${tx.category?.color??'#6b7280'}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
                          {tx.category?.icon ?? (tx.type==='income'?'💰':'📦')}
                        </div>
                        <div style={{ flex:1 }}>
                          <p style={{ fontWeight:700, fontSize:14 }}>{tx.description ?? tx.category?.name ?? (tx.type==='income'?'Ingreso':'Gasto')}</p>
                          <div style={{ display:'flex', gap:6, marginTop:2, alignItems:'center' }}>
                            {tx.category && <span style={{ fontSize:11, color:'var(--ht-text-3)' }}>{tx.category.name}</span>}
                            {members.length>1 && <span style={{ fontSize:11, color:'var(--ht-text-4)' }}>· {(tx.profile as any)?.name?.split(' ')[0]}</span>}
                            {tx.visibility==='private' && <Lock size={10} color="var(--ht-text-4)" />}
                          </div>
                        </div>
                        <div style={{ textAlign:'right', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                          <p style={{ fontSize:15, fontWeight:900, color:tx.type==='income'?'#10b981':'#f43f5e', letterSpacing:'-0.01em' }}>
                            {tx.type==='income'?'+':'-'}{fmt(Number(tx.amount))}
                          </p>
                          {tx.profile_id===user?.id && (
                            <div style={{ display:'flex', gap:4 }}>
                              <button onClick={() => openAdd(tx)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--ht-purple)', padding:2 }}><Edit2 size={12} /></button>
                              <button onClick={() => deleteTx(tx.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--ht-text-4)', padding:2 }}><Trash2 size={12} /></button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))
            }
          </>
        )}

        {/* ── PRESUPUESTOS ── */}
        {tab === 'presupuestos' && (
          <>
            <p style={{ fontSize:13, color:'var(--ht-text-3)', marginBottom:16, lineHeight:1.6 }}>
              Tocá una categoría para fijar o editar tu meta mensual.
            </p>
            {categories.filter(c => c.type==='expense'||c.type==='both').map(cat => {
              const spent  = transactions.filter(t => t.type==='expense'&&t.category_id===cat.id).reduce((s,t)=>s+Number(t.amount),0)
              const budget = budgets.find(b => b.category_id===cat.id)
              const pct    = budget ? Math.min(100, Math.round((spent/budget.amount)*100)) : 0
              const barColor = pct>=100?'#f43f5e':pct>=80?'#f59e0b':cat.color
              return (
                <div key={cat.id} className="ht-card" style={{ marginBottom:10, padding:16, cursor:'pointer', transition:'box-shadow 0.15s' }}
                  onClick={() => { setBudgetModal(cat); setBudgetAmt(budget?String(budget.amount):'') }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:budget?10:0 }}>
                    <span style={{ fontSize:22 }}>{cat.icon}</span>
                    <div style={{ flex:1 }}>
                      <p style={{ fontWeight:700, fontSize:14 }}>{cat.name}</p>
                      <p style={{ fontSize:12, color:'var(--ht-text-3)' }}>
                        {fmt(spent)}{budget?` de ${fmt(budget.amount)}`:''}
                      </p>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      {budget
                        ? <span style={{ fontSize:12, fontWeight:800, color:barColor, background:`${barColor}15`, padding:'3px 8px', borderRadius:9999 }}>{pct}%</span>
                        : <span style={{ fontSize:11, fontWeight:700, color:'var(--ht-text-4)', background:'rgba(0,0,0,0.05)', padding:'3px 8px', borderRadius:9999 }}>Sin meta</span>
                      }
                      <Edit2 size={14} color="var(--ht-text-4)" />
                    </div>
                  </div>
                  {budget && (
                    <div style={{ height:6, background:'rgba(0,0,0,0.06)', borderRadius:9999, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:barColor, borderRadius:9999, transition:'width 0.4s ease' }} />
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* ══ MODAL AGREGAR/EDITAR MOVIMIENTO ══ */}
      {showAdd && (
        <>
          <div className="ht-overlay" onClick={() => setShowAdd(false)} />
          <div className="ht-modal">
            <div style={{ padding:'20px 16px 0' }}>
              <div style={{ width:36, height:4, background:'rgba(124,58,237,0.2)', borderRadius:9999, margin:'0 auto 16px' }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                <h2 style={{ fontSize:17, fontWeight:800 }}>{editTx?'Editar movimiento':'Agregar movimiento'}</h2>
                <button onClick={() => setShowAdd(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--ht-text-3)', padding:4 }}><X size={20} /></button>
              </div>
            </div>
            <div style={{ padding:'0 16px 32px' }}>
              {/* Tipo */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:20, background:'rgba(0,0,0,0.04)', padding:4, borderRadius:9999 }}>
                {(['expense','income'] as const).map(t => (
                  <button key={t} onClick={() => { setAddType(t); setAddCat('') }} style={{ padding:'10px', borderRadius:9999, border:'none', cursor:'pointer', fontSize:14, fontWeight:800, background:addType===t?(t==='expense'?'#f43f5e':'#10b981'):'transparent', color:addType===t?'white':'var(--ht-text-3)', transition:'all 0.15s' }}>
                    {t==='expense'?'Gasto':'Ingreso'}
                  </button>
                ))}
              </div>
              {/* Monto */}
              <div style={{ position:'relative', marginBottom:16 }}>
                <span style={{ position:'absolute', left:16, top:'50%', transform:'translateY(-50%)', fontSize:20, fontWeight:900, color:'var(--ht-text-3)' }}>$</span>
                <input type="number" placeholder="0" value={addAmount} onChange={e => setAddAmount(e.target.value)} style={{ width:'100%', padding:'14px 16px 14px 36px', border:`2px solid ${addType==='income'?'rgba(16,185,129,0.4)':'rgba(244,63,94,0.4)'}`, borderRadius:9999, fontSize:28, fontWeight:900, background:'rgba(255,255,255,0.8)', color:addType==='income'?'#10b981':'#f43f5e', outline:'none', fontFamily:'var(--font-qs)' }} autoFocus={!editTx} />
              </div>
              {/* Categoría */}
              <p style={{ fontSize:12, fontWeight:700, color:'var(--ht-text-3)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>Categoría</p>
              <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4, marginBottom:16 }}>
                {filteredCats.map(cat => (
                  <button key={cat.id} onClick={() => setAddCat(addCat===cat.id?'':cat.id)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, padding:'10px 12px', borderRadius:14, flexShrink:0, border:'1.5px solid', borderColor:addCat===cat.id?cat.color:'var(--ht-glass-border)', background:addCat===cat.id?`${cat.color}15`:'var(--ht-glass-warm)', cursor:'pointer', transition:'all 0.15s' }}>
                    <span style={{ fontSize:20 }}>{cat.icon}</span>
                    <span style={{ fontSize:10, fontWeight:700, color:addCat===cat.id?cat.color:'var(--ht-text-3)', whiteSpace:'nowrap' }}>{cat.name}</span>
                  </button>
                ))}
              </div>
              <input className="ht-input" placeholder="Descripción (opcional)" value={addDesc} onChange={e => setAddDesc(e.target.value)} style={{ marginBottom:12 }} />
              <input type="date" className="ht-input" value={addDate} onChange={e => setAddDate(e.target.value)} style={{ marginBottom:12 }} />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:20 }}>
                {(['shared','private'] as const).map(v => (
                  <button key={v} onClick={() => setAddVisib(v)} style={{ padding:'10px', borderRadius:14, border:'1.5px solid', borderColor:addVisib===v?(v==='shared'?'var(--ht-mint)':'var(--ht-purple)'):'var(--ht-glass-border)', background:addVisib===v?(v==='shared'?'rgba(16,185,129,0.08)':'rgba(124,58,237,0.08)'):'var(--ht-glass-warm)', cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}>
                    {v==='shared' ? <Globe size={14} color={addVisib===v?'var(--ht-mint)':'var(--ht-text-4)'} style={{ marginBottom:4 }} /> : <Lock size={14} color={addVisib===v?'var(--ht-purple)':'var(--ht-text-4)'} style={{ marginBottom:4 }} />}
                    <p style={{ fontSize:12, fontWeight:700, color:addVisib===v?(v==='shared'?'var(--ht-mint)':'var(--ht-purple)'):'var(--ht-text)' }}>{v==='shared'?'Compartido':'Privado'}</p>
                    <p style={{ fontSize:10, color:'var(--ht-text-3)' }}>{v==='shared'?'Todos lo ven':'Solo vos'}</p>
                  </button>
                ))}
              </div>
              <button onClick={saveTransaction} disabled={saving||!addAmount} className="ht-btn ht-btn-primary" style={{ width:'100%', padding:'13px' }}>
                {saving ? <><div className="ht-spinner" /> Guardando...</> : <><Check size={16} /> {editTx?'Guardar cambios':(`Guardar ${addType==='income'?'ingreso':'gasto'}`)}</>}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ══ MODAL PRESUPUESTO ══ */}
      {budgetModal && (
        <>
          <div className="ht-overlay" onClick={() => setBudgetModal(null)} />
          <div className="ht-modal">
            <div style={{ padding:'24px 16px 32px' }}>
              <div style={{ width:36, height:4, background:'rgba(124,58,237,0.2)', borderRadius:9999, margin:'0 auto 20px' }} />
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
                <div style={{ width:48, height:48, borderRadius:9999, background:`${budgetModal.color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>
                  {budgetModal.icon}
                </div>
                <div>
                  <p style={{ fontWeight:800, fontSize:17 }}>{budgetModal.name}</p>
                  <p style={{ fontSize:13, color:'var(--ht-text-3)' }}>Meta mensual</p>
                </div>
              </div>
              <p style={{ fontSize:12, fontWeight:700, color:'var(--ht-text-3)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>¿Cuánto querés gastar por mes?</p>
              <div style={{ position:'relative', marginBottom:20 }}>
                <span style={{ position:'absolute', left:16, top:'50%', transform:'translateY(-50%)', fontSize:20, fontWeight:900, color:'var(--ht-text-3)' }}>$</span>
                <input type="number" placeholder="0" value={budgetAmt} onChange={e => setBudgetAmt(e.target.value)} style={{ width:'100%', padding:'14px 16px 14px 36px', border:`2px solid ${budgetModal.color}40`, borderRadius:9999, fontSize:26, fontWeight:900, background:'rgba(255,255,255,0.8)', color:budgetModal.color, outline:'none', fontFamily:'var(--font-qs)' }} autoFocus />
              </div>
              <div style={{ display:'flex', gap:8 }}>
                {budgets.find(b => b.category_id===budgetModal.id) && (
                  <button onClick={() => { deleteBudget(budgetModal.id); setBudgetModal(null) }} className="ht-btn ht-btn-danger" style={{ flex:1 }}><Trash2 size={14} /> Quitar meta</button>
                )}
                <button onClick={saveBudget} disabled={savingBudget||!budgetAmt} className="ht-btn ht-btn-primary" style={{ flex:2, padding:'13px' }}>
                  {savingBudget ? <><div className="ht-spinner" /> Guardando...</> : <><Target size={15} /> Guardar meta</>}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══ MODAL IMPORTAR EXCEL ══ */}
      {showImport && profile && (
        <ImportExcelModal
          householdId={household!.id}
          profileId={profile.id}
          members={members.map(m => ({ profile_id: m.profile_id, name: m.profile?.name ?? 'Miembro' }))}
          categories={categories}
          onClose={() => setShowImport(false)}
          onImported={(firstDate?: string) => {
            setShowImport(false)
            // Navigate to the month of the imported data if provided
            if (firstDate) {
              const d = new Date(firstDate + 'T12:00:00')
              setYear(d.getFullYear())
              setMonth(d.getMonth())
              setTab('movimientos')
            }
            loadData()
          }}
        />
      )}

      {/* ══ MODAL CATEGORÍAS ══ */}
      {showSettings && (
        <>
          <div className="ht-overlay" onClick={() => setShowSettings(false)} />
          <div className="ht-modal">
            <div style={{ padding:'20px 16px 0' }}>
              <div style={{ width:36, height:4, background:'rgba(124,58,237,0.2)', borderRadius:9999, margin:'0 auto 16px' }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <h2 style={{ fontSize:17, fontWeight:800 }}>Categorías</h2>
                <button onClick={() => setShowSettings(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--ht-text-3)', padding:4 }}><X size={20} /></button>
              </div>
            </div>
            <div style={{ padding:'0 16px 32px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
                {(['expense','income'] as const).map(t => (
                  <button key={t} onClick={() => setNewCatType(t)} style={{ padding:'8px', borderRadius:9999, border:'1.5px solid', borderColor:newCatType===t?'var(--ht-purple)':'var(--ht-glass-border)', background:newCatType===t?'var(--ht-purple-light)':'var(--ht-glass-warm)', fontSize:13, fontWeight:700, cursor:'pointer', color:newCatType===t?'var(--ht-purple)':'var(--ht-text-3)' }}>
                    {t==='expense'?'Gasto':'Ingreso'}
                  </button>
                ))}
              </div>
              <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                <input value={newCatIcon} onChange={e => setNewCatIcon(e.target.value)} style={{ width:52, border:'1.5px solid var(--ht-glass-border)', borderRadius:12, textAlign:'center', fontSize:20, padding:'8px 4px', background:'var(--ht-glass-warm)', outline:'none' }} maxLength={2} />
                <input className="ht-input" placeholder="Nombre de categoría" value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => e.key==='Enter'&&addCategory()} />
                <button onClick={addCategory} disabled={!newCatName.trim()} className="ht-btn ht-btn-primary" style={{ flexShrink:0, padding:'9px 14px' }}><Plus size={15} /></button>
              </div>
              <div style={{ maxHeight:'50vh', overflowY:'auto' }}>
                {categories.map(cat => (
                  <div key={cat.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:12, background:'var(--ht-glass-warm)', border:'1px solid var(--ht-glass-border)', marginBottom:6 }}>
                    <span style={{ fontSize:20 }}>{cat.icon}</span>
                    <div style={{ flex:1 }}>
                      <p style={{ fontWeight:700, fontSize:14 }}>{cat.name}</p>
                      <p style={{ fontSize:11, color:'var(--ht-text-3)', textTransform:'capitalize' }}>{cat.type==='income'?'Ingreso':cat.type==='both'?'Ambos':'Gasto'}</p>
                    </div>
                    <div style={{ width:12, height:12, borderRadius:9999, background:cat.color, flexShrink:0 }} />
                    <button onClick={() => deleteCategory(cat.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--ht-text-4)', padding:4 }}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
