'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Transaction, ExpenseCategory, Budget } from '@/lib/types'
import {
  TrendingUp, Plus, ArrowUpCircle, ArrowDownCircle,
  X, Check, Trash2, Lock, Globe, Settings, Edit2, Target, FileSpreadsheet,
  PieChartIcon, BarChart2, List, Wallet, Download
} from 'lucide-react'
import * as XLSX from 'xlsx'
import ImportExcelModal from '@/components/ImportExcelModal'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts'

const DEFAULT_CATEGORIES = [
  { name: 'Comida',          icon: '🍕', color: '#8B2020', type: 'expense' },
  { name: 'Transporte',      icon: '🚗', color: '#b45309', type: 'expense' },
  { name: 'Hogar',           icon: '🏠', color: '#C8956C', type: 'expense' },
  { name: 'Salud',           icon: '💊', color: '#0f766e', type: 'expense' },
  { name: 'Entretenimiento', icon: '🎬', color: '#7A8A5E', type: 'expense' },
  { name: 'Ropa',            icon: '👕', color: '#8B2020', type: 'expense' },
  { name: 'Educación',       icon: '📚', color: '#C8956C', type: 'expense' },
  { name: 'Sueldo',          icon: '💼', color: '#3D6B42', type: 'income'  },
  { name: 'Otros ingresos',  icon: '💰', color: '#b45309', type: 'income'  },
  { name: 'Otros gastos',    icon: '📦', color: '#6b7280', type: 'expense' },
] as const

type Tab = 'resumen' | 'movimientos' | 'presupuestos'

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const MONTHS_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)
const fmtShort = (n: number) => {
  if (Math.abs(n) >= 1000000) return `$${(n/1000000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `$${(n/1000).toFixed(0)}k`
  return fmt(n)
}

function FinancesInner() {
  const { user, profile, household, members } = useAuth()
  const supabase = createClient()
  const searchParams = useSearchParams()

  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [tab, setTab]     = useState<Tab>('resumen')
  const [refreshKey, setRefreshKey] = useState(0)

  const [categories,    setCategories]    = useState<ExpenseCategory[]>([])
  const [transactions,  setTransactions]  = useState<Transaction[]>([])
  const [prevTxs,       setPrevTxs]       = useState<{amount:string;type:string;category_id:string|null}[]>([])  // prev month for chart
  const [budgets,       setBudgets]       = useState<Budget[]>([])

  // Filters
  const [filterType,    setFilterType]    = useState<'all'|'income'|'expense'>('all')
  const [filterCat,     setFilterCat]     = useState<string>('all')
  const [filterMember,  setFilterMember]  = useState<string>('all')

  // Add/edit modal
  const [editTx,        setEditTx]        = useState<Transaction | null>(null)
  const [showAdd,       setShowAdd]       = useState(false)
  const [addType,       setAddType]       = useState<'income'|'expense'>('expense')
  const [addAmount,     setAddAmount]     = useState('')
  const [addCat,        setAddCat]        = useState('')
  const [addDesc,       setAddDesc]       = useState('')
  const [addDate,       setAddDate]       = useState(new Date().toISOString().split('T')[0])
  const [addVisib,      setAddVisib]      = useState<'shared'|'private'>('shared')
  const [addSharedWith, setAddSharedWith] = useState('')
  const [saving,        setSaving]        = useState(false)

  // Budget modal
  const [budgetModal,   setBudgetModal]   = useState<ExpenseCategory | null>(null)
  const [budgetAmt,     setBudgetAmt]     = useState('')
  const [savingBudget,  setSavingBudget]  = useState(false)

  // Settings / import
  const [showSettings,  setShowSettings]  = useState(false)
  const [showImport,    setShowImport]    = useState(false)

  function exportToExcel() {
    const rows = transactions.map(t => ({
      Fecha: t.date,
      Tipo: t.type === 'income' ? 'Ingreso' : 'Gasto',
      Categoría: t.category?.name ?? '',
      Descripción: t.description ?? '',
      Monto: Number(t.amount),
      Visibilidad: t.visibility === 'shared' ? 'Compartido' : 'Privado',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Movimientos')
    XLSX.writeFile(wb, `HomeTurn-Finanzas-${MONTHS_FULL[month]}-${year}.xlsx`)
  }
  const [newCatName,    setNewCatName]    = useState('')
  const [newCatIcon,    setNewCatIcon]    = useState('📦')
  const [newCatType,    setNewCatType]    = useState<'income'|'expense'>('expense')

  // Recordar último tipo seleccionado
  useEffect(() => {
    const last = localStorage.getItem('ht-last-tx-type') as 'income'|'expense'|null
    if (last) setAddType(last)
  }, [])

  function setAddTypeAndSave(t: 'income'|'expense') {
    setAddType(t); setAddCat('')
    localStorage.setItem('ht-last-tx-type', t)
  }

  // PWA shortcut: auto-open from URL ?q=expense|income
  useEffect(() => {
    const q = searchParams.get('q')
    if (q === 'expense') { setAddTypeAndSave('expense'); setShowAdd(true) }
    if (q === 'income')  { setAddTypeAndSave('income');  setShowAdd(true) }
  }, [searchParams])

  useEffect(() => { if (household) initFinances() }, [household])

  const loadData = useCallback(async () => {
    if (!household || !user) return
    const startDate = `${year}-${String(month+1).padStart(2,'0')}-01`
    const endDate   = new Date(year, month+1, 0).toISOString().split('T')[0]
    const prevM = month === 0 ? 11 : month - 1
    const prevY = month === 0 ? year - 1 : year
    const prevStart = `${prevY}-${String(prevM+1).padStart(2,'0')}-01`
    const prevEnd   = new Date(prevY, prevM+1, 0).toISOString().split('T')[0]
    const visFilter = `visibility.eq.shared,profile_id.eq.${user.id},shared_with.cs.{${user.id}}`

    const [{ data: txs }, { data: prevData }, { data: buds }] = await Promise.all([
      supabase.from('transactions')
        .select('*, category:expense_categories(*), profile:profiles(id,name,avatar_url)')
        .eq('household_id', household.id)
        .gte('date', startDate).lte('date', endDate)
        .or(visFilter)
        .order('date', { ascending: false }),
      supabase.from('transactions')
        .select('amount,type,category_id')
        .eq('household_id', household.id)
        .gte('date', prevStart).lte('date', prevEnd)
        .or(visFilter),
      supabase.from('budgets').select('*, category:expense_categories(*)').eq('household_id', household.id),
    ])
    setTransactions(txs ?? [])
    setPrevTxs(prevData ?? [])
    setBudgets(buds ?? [])
  }, [household, user, year, month, refreshKey])

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
      setEditTx(tx); setAddType(tx.type); setAddAmount(String(tx.amount))
      setAddCat(tx.category_id ?? ''); setAddDesc(tx.description ?? '')
      setAddDate(tx.date); setAddVisib(tx.visibility); setAddSharedWith('')
    } else {
      setEditTx(null); setAddType('expense'); setAddAmount('')
      setAddCat(''); setAddDesc('')
      setAddDate(new Date().toISOString().split('T')[0])
      setAddVisib('shared'); setAddSharedWith('')
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
      date: addDate,
      visibility: addSharedWith ? 'private' : addVisib,
      shared_with: addSharedWith ? [addSharedWith] : [],
    }
    if (editTx) {
      await supabase.from('transactions').update(payload).eq('id', editTx.id)
    } else {
      await supabase.from('transactions').insert(payload)
      // Notificar al hogar si es compartido
      if (payload.visibility === 'shared') {
        const otherMembers = members.filter(m => m.profile_id !== profile.id)
        const cat = categories.find(c => c.id === addCat)
        const title = `${profile.name.split(' ')[0]} agregó ${addType === 'income' ? 'un ingreso' : 'un gasto'}`
        const body = `${cat?.icon ?? ''} ${addDesc || cat?.name || ''} · ${fmt(parseFloat(addAmount))}`
        if (otherMembers.length > 0) {
          await supabase.from('notifications').insert(
            otherMembers.map(m => ({
              household_id: household.id,
              for_profile_id: m.profile_id,
              from_profile_id: profile.id,
              type: 'transaction',
              title, body,
            }))
          )
        }
      }
    }
    // Alerta de presupuesto si supera el 80%
    if (!editTx && addType === 'expense' && addCat) {
      const budget = budgets.find(b => b.category_id === addCat)
      if (budget) {
        const spent = transactions.filter(t => t.type==='expense' && t.category_id===addCat).reduce((s,t)=>s+Number(t.amount),0) + parseFloat(addAmount)
        const pct = (spent / Number(budget.amount)) * 100
        if (pct >= 80) {
          const cat = categories.find(c => c.id === addCat)
          const otherMembers = members.filter(m => m.profile_id !== profile.id)
          if (otherMembers.length > 0) {
            await supabase.from('notifications').insert(
              otherMembers.map(m => ({
                household_id: household.id, for_profile_id: m.profile_id,
                from_profile_id: profile.id, type: 'transaction',
                title: `${pct >= 100 ? '⚠️ Presupuesto superado' : '🔶 Presupuesto al ' + Math.round(pct) + '%'}`,
                body: `${cat?.icon ?? ''} ${cat?.name}: ${fmtShort(spent)} de ${fmtShort(Number(budget.amount))}`,
              }))
            )
          }
        }
      }
    }

    setSaving(false); setShowAdd(false); setEditTx(null); setAddSharedWith('')
    setRefreshKey(k => k + 1)
  }

  async function deleteTx(id: string) {
    await supabase.from('transactions').delete().eq('id', id)
    setTransactions(prev => prev.filter(t => t.id !== id))
  }

  async function saveBudget() {
    if (!budgetAmt || !budgetModal || !household) return
    setSavingBudget(true)
    const existing = budgets.find(b => b.category_id === budgetModal.id)
    if (existing) await supabase.from('budgets').update({ amount: parseFloat(budgetAmt) }).eq('id', existing.id)
    else await supabase.from('budgets').insert({ household_id: household.id, category_id: budgetModal.id, amount: parseFloat(budgetAmt), period: 'monthly' })
    await loadData(); setSavingBudget(false); setBudgetModal(null); setBudgetAmt('')
  }

  async function deleteBudget(catId: string) {
    const b = budgets.find(b => b.category_id === catId)
    if (b) { await supabase.from('budgets').delete().eq('id', b.id); setBudgets(prev => prev.filter(x => x.id !== b.id)) }
  }

  async function addCategory() {
    if (!newCatName.trim() || !household) return
    const colors = ['#8B2020','#b45309','#C8956C','#3D6B42','#7A8A5E','#0f766e']
    const color = colors[categories.length % colors.length]
    const { data } = await supabase.from('expense_categories').insert({ household_id: household.id, name: newCatName.trim(), icon: newCatIcon, color, type: newCatType }).select().single()
    if (data) { setCategories(prev => [...prev, data]); setNewCatName('') }
  }

  async function deleteCategory(id: string) {
    await supabase.from('expense_categories').delete().eq('id', id)
    setCategories(prev => prev.filter(c => c.id !== id))
  }

  // ── Computed ──
  const income  = transactions.filter(t => t.type==='income').reduce((s,t)  => s+Number(t.amount), 0)
  const expense = transactions.filter(t => t.type==='expense').reduce((s,t) => s+Number(t.amount), 0)
  const balance = income - expense
  const savingsRate = income > 0 ? Math.round((balance / income) * 100) : 0

  const prevIncome  = prevTxs.filter(t => t.type==='income').reduce((s,t)  => s+Number(t.amount), 0)
  const prevExpense = prevTxs.filter(t => t.type==='expense').reduce((s,t) => s+Number(t.amount), 0)

  const pieData = categories
    .map(cat => ({ name: cat.name, value: transactions.filter(t => t.type==='expense' && t.category_id===cat.id).reduce((s,t)=>s+Number(t.amount),0), color: cat.color, icon: cat.icon }))
    .filter(d => d.value > 0).sort((a,b) => b.value - a.value)

  const barData = [
    { mes: MONTHS[month===0?11:month-1], Ingresos: prevIncome, Gastos: prevExpense },
    { mes: MONTHS[month], Ingresos: income, Gastos: expense },
  ]

  const filteredTx = transactions.filter(t => {
    if (filterType!=='all' && t.type!==filterType) return false
    if (filterCat!=='all' && t.category_id!==filterCat) return false
    if (filterMember!=='all' && t.profile_id!==filterMember) return false
    return true
  })

  const txByDay = filteredTx.reduce((acc, t) => {
    const d = new Date(t.date+'T12:00:00').toLocaleDateString('es-AR', { weekday:'short', day:'numeric', month:'short' })
    if (!acc[d]) acc[d] = []; acc[d].push(t); return acc
  }, {} as Record<string, Transaction[]>)

  const filteredCats = categories.filter(c => c.type===addType || c.type==='both')
  const prevMonth = () => { if (month===0){setMonth(11);setYear(y=>y-1)}else setMonth(m=>m-1) }
  const nextMonth = () => {
    const nm=month===11?0:month+1; const ny=month===11?year+1:year
    if (ny>now.getFullYear()||(ny===now.getFullYear()&&nm>now.getMonth())) return
    setMonth(nm); if(month===11)setYear(y=>y+1)
  }

  return (
    <div>
      {/* Header */}
      <div className="ht-page-header" style={{ paddingRight: 52 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <TrendingUp size={20} color="var(--ht-primary)" strokeWidth={2} />
            <h1 style={{ fontSize:20, fontWeight:800 }}>Finanzas</h1>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={exportToExcel} disabled={transactions.length === 0} style={{ background:'rgba(4,120,87,0.08)', border:'none', borderRadius:9999, padding:'7px 10px', cursor:'pointer', color:'#3D6B42', opacity: transactions.length === 0 ? 0.4 : 1 }} title="Exportar Excel">
              <Download size={15} />
            </button>
            <button onClick={() => setShowImport(true)} style={{ background:'rgba(200,149,108,0.08)', border:'none', borderRadius:9999, padding:'7px 10px', cursor:'pointer', color:'var(--ht-purple)' }}>
              <FileSpreadsheet size={15} />
            </button>
            <button onClick={() => setShowSettings(true)} style={{ background:'rgba(200,149,108,0.08)', border:'none', borderRadius:9999, padding:'7px 10px', cursor:'pointer', color:'var(--ht-purple)' }}>
              <Settings size={15} />
            </button>
            <button onClick={() => openAdd()} className="ht-btn ht-btn-primary" style={{ padding:'7px 14px', fontSize:13 }}>
              <Plus size={14} /> Agregar
            </button>
          </div>
        </div>

        {/* Month selector */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <button onClick={prevMonth} style={{ background:'rgba(200,149,108,0.08)', border:'none', borderRadius:9999, padding:'6px 12px', cursor:'pointer', color:'var(--ht-purple)', fontWeight:700, fontSize:15 }}>‹</button>
          <span style={{ fontWeight:800, fontSize:15 }}>{MONTHS_FULL[month]} {year}</span>
          <button onClick={nextMonth} style={{ background:'rgba(200,149,108,0.08)', border:'none', borderRadius:9999, padding:'6px 12px', cursor:'pointer', color:'var(--ht-purple)', fontWeight:700, fontSize:15 }}>›</button>
        </div>
      </div>

      <div className="ht-page" style={{ paddingTop:16 }}>

        {/* ── KPI BENTO ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
          <div className="ht-card" style={{ background:'rgba(4,120,87,0.07)', border:'1px solid rgba(4,120,87,0.15)', padding:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:5 }}>
              <ArrowUpCircle size={13} color="#047857" />
              <span style={{ fontSize:10, fontWeight:700, color:'var(--ht-text-3)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Ingresos</span>
            </div>
            <p style={{ fontSize:20, fontWeight:900, color:'#3D6B42', letterSpacing:'-0.02em' }}>{fmtShort(income)}</p>
            {prevIncome > 0 && <p style={{ fontSize:11, color:'var(--ht-text-4)', marginTop:3 }}>vs {fmtShort(prevIncome)} mes ant.</p>}
          </div>
          <div className="ht-card" style={{ background:'rgba(190,24,93,0.07)', border:'1px solid rgba(139,32,32,0.15)', padding:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:5 }}>
              <ArrowDownCircle size={13} color="#be185d" />
              <span style={{ fontSize:10, fontWeight:700, color:'var(--ht-text-3)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Gastos</span>
            </div>
            <p style={{ fontSize:20, fontWeight:900, color:'#8B2020', letterSpacing:'-0.02em' }}>{fmtShort(expense)}</p>
            {prevExpense > 0 && <p style={{ fontSize:11, color:'var(--ht-text-4)', marginTop:3 }}>vs {fmtShort(prevExpense)} mes ant.</p>}
          </div>
        </div>

        {/* Balance + Ahorro bento */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 84px', gap:10, marginBottom:14 }}>
          <div className="ht-card" style={{ background: balance>=0?'rgba(4,120,87,0.05)':'rgba(190,24,93,0.05)', border:`1px solid ${balance>=0?'rgba(4,120,87,0.12)':'rgba(190,24,93,0.12)'}`, padding:'13px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <p style={{ fontSize:11, fontWeight:700, color:'var(--ht-text-3)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>Balance</p>
              <p style={{ fontSize:22, fontWeight:900, color:balance>=0?'#3D6B42':'#8B2020', letterSpacing:'-0.02em' }}>{balance>=0?'+':''}{fmtShort(balance)}</p>
            </div>
            <Wallet size={28} color={balance>=0?'#3D6B42':'#8B2020'} strokeWidth={1.5} />
          </div>
          <div className="ht-card" style={{ padding:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'rgba(124,58,237,0.07)', border:'1px solid rgba(200,149,108,0.12)' }}>
            <p style={{ fontSize:22, fontWeight:900, color:'var(--ht-purple)', letterSpacing:'-0.03em' }}>{savingsRate}%</p>
            <p style={{ fontSize:10, fontWeight:700, color:'var(--ht-text-3)', marginTop:2 }}>ahorro</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, marginBottom:16, background:'rgba(124,58,237,0.06)', padding:4, borderRadius:9999 }}>
          {([['resumen', PieChartIcon, 'Resumen'], ['movimientos', List, 'Movimientos'], ['presupuestos', Target, 'Metas']] as const).map(([t, Icon, label]) => (
            <button key={t} onClick={() => setTab(t as Tab)} style={{ padding:'8px 4px', borderRadius:9999, border:'none', cursor:'pointer', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:4, background:tab===t?'white':'transparent', color:tab===t?'var(--ht-purple)':'var(--ht-text-3)', boxShadow:tab===t?'0 2px 8px rgba(200,149,108,0.1)':'none', transition:'all 0.15s' }}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {/* ── RESUMEN ── */}
        {tab === 'resumen' && (
          transactions.length === 0
            ? <div className="ht-card" style={{ textAlign:'center', padding:'32px 20px' }}>
                <TrendingUp size={28} color="rgba(200,149,108,0.3)" style={{ margin:'0 auto 10px', display:'block' }} />
                <p style={{ fontWeight:700, fontSize:15, marginBottom:6 }}>Sin movimientos este mes</p>
                <p style={{ fontSize:13, color:'var(--ht-text-3)', marginBottom:16 }}>Agregá tu primer ingreso o gasto</p>
                <button onClick={() => openAdd()} className="ht-btn ht-btn-primary"><Plus size={14} /> Agregar</button>
              </div>
            : <>
                {/* Bar chart - comparativo */}
                <div className="ht-card" style={{ padding:'16px 8px', marginBottom:12 }}>
                  <p style={{ fontWeight:800, fontSize:13, marginBottom:12, paddingLeft:8 }}>Comparativo mensual</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={barData} margin={{ top:0, right:8, left:-20, bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                      <XAxis dataKey="mes" tick={{ fontSize:11, fontWeight:700 }} />
                      <YAxis tick={{ fontSize:10 }} tickFormatter={v => fmtShort(Number(v))} />
                      <Tooltip formatter={(v) => fmt(Number(v))} />
                      <Bar dataKey="Ingresos" fill="#047857" radius={[4,4,0,0]} />
                      <Bar dataKey="Gastos"   fill="#be185d" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Pie chart */}
                {pieData.length > 0 && (
                  <div className="ht-card" style={{ padding:'16px 12px', marginBottom:12 }}>
                    <p style={{ fontWeight:800, fontSize:13, marginBottom:12 }}>Gastos por categoría</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={3} dataKey="value">
                          {pieData.map((e,i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip formatter={(v) => fmt(Number(v))} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display:'flex', flexDirection:'column', gap:7, marginTop:10 }}>
                      {pieData.map(d => (
                        <div key={d.name} style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{ width:10, height:10, borderRadius:9999, background:d.color, flexShrink:0 }} />
                          <span style={{ flex:1, fontSize:13, fontWeight:600 }}>{d.icon} {d.name}</span>
                          <span style={{ fontSize:13, fontWeight:800, color:d.color }}>{fmtShort(d.value)}</span>
                          {expense>0 && <span style={{ fontSize:11, color:'var(--ht-text-4)', minWidth:32, textAlign:'right' }}>{Math.round((d.value/expense)*100)}%</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
        )}

        {/* ── MOVIMIENTOS ── */}
        {tab === 'movimientos' && (
          <>
            {/* Filters */}
            <div style={{ display:'flex', gap:6, marginBottom:14, overflowX:'auto', paddingBottom:4 }}>
              {(['all','expense','income'] as const).map(f => (
                <button key={f} onClick={() => setFilterType(f)} style={{ padding:'5px 12px', borderRadius:9999, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, flexShrink:0, background:filterType===f?'var(--ht-purple)':'rgba(200,149,108,0.08)', color:filterType===f?'white':'var(--ht-purple)', transition:'all 0.15s' }}>
                  {f==='all'?'Todos':f==='expense'?'Gastos':'Ingresos'}
                </button>
              ))}
              <div style={{ width:1, background:'var(--ht-glass-border)', flexShrink:0 }} />
              {categories.filter(c => filteredTx.some(t => t.category_id===c.id)).map(cat => (
                <button key={cat.id} onClick={() => setFilterCat(filterCat===cat.id?'all':cat.id)} style={{ padding:'5px 12px', borderRadius:9999, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, flexShrink:0, background:filterCat===cat.id?cat.color:'rgba(0,0,0,0.04)', color:filterCat===cat.id?'white':'var(--ht-text-3)', transition:'all 0.15s' }}>
                  {cat.icon} {cat.name}
                </button>
              ))}
              {members.length > 1 && members.map(m => (
                <button key={m.profile_id} onClick={() => setFilterMember(filterMember===m.profile_id?'all':m.profile_id)} style={{ padding:'5px 12px', borderRadius:9999, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, flexShrink:0, background:filterMember===m.profile_id?'var(--ht-purple)':'rgba(0,0,0,0.04)', color:filterMember===m.profile_id?'white':'var(--ht-text-3)', transition:'all 0.15s' }}>
                  {m.profile?.name?.split(' ')[0]}
                </button>
              ))}
            </div>

            {filteredTx.length === 0
              ? <div className="ht-card" style={{ textAlign:'center', padding:'28px 20px' }}>
                  <p style={{ fontWeight:700, fontSize:15, marginBottom:6 }}>Sin movimientos</p>
                  <p style={{ fontSize:13, color:'var(--ht-text-3)' }}>{filterType!=='all'||filterCat!=='all'?'Probá cambiando los filtros':'Agregá tu primer movimiento'}</p>
                </div>
              : Object.entries(txByDay).map(([day, list]) => (
                  <div key={day} style={{ marginBottom:16 }}>
                    <p className="ht-section-label">{day}</p>
                    {list.map(tx => (
                      <div key={tx.id} className="ht-list-item" style={{ marginBottom:6 }}>
                        <div style={{ width:38, height:38, borderRadius:9999, flexShrink:0, background:`${tx.category?.color??'#6b7280'}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
                          {tx.category?.icon ?? (tx.type==='income'?'💰':'📦')}
                        </div>
                        <div style={{ flex:1 }}>
                          <p style={{ fontWeight:700, fontSize:14 }}>{tx.description ?? tx.category?.name ?? (tx.type==='income'?'Ingreso':'Gasto')}</p>
                          <div style={{ display:'flex', gap:6, alignItems:'center', marginTop:2 }}>
                            {tx.category && <span style={{ fontSize:11, color:'var(--ht-text-3)' }}>{tx.category.name}</span>}
                            {members.length>1 && <span style={{ fontSize:11, color:'var(--ht-text-4)' }}>· {(tx.profile as any)?.name?.split(' ')[0]}</span>}
                            {tx.visibility==='private' && <Lock size={10} color="var(--ht-text-4)" />}
                          </div>
                        </div>
                        <div style={{ textAlign:'right', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                          <p style={{ fontSize:15, fontWeight:900, color:tx.type==='income'?'#3D6B42':'#8B2020', letterSpacing:'-0.01em' }}>
                            {tx.type==='income'?'+':'-'}{fmtShort(Number(tx.amount))}
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

        {/* ── PRESUPUESTOS / METAS ── */}
        {tab === 'presupuestos' && (
          <>
            <p style={{ fontSize:13, color:'var(--ht-text-3)', marginBottom:16, lineHeight:1.6 }}>
              Tocá una categoría para fijar tu meta mensual.
            </p>
            {categories.filter(c => c.type==='expense'||c.type==='both').map(cat => {
              const spent  = transactions.filter(t => t.type==='expense'&&t.category_id===cat.id).reduce((s,t)=>s+Number(t.amount),0)
              const budget = budgets.find(b => b.category_id===cat.id)
              const pct    = budget ? Math.min(100, Math.round((spent/budget.amount)*100)) : 0
              const barColor = pct>=100?'#8B2020':pct>=80?'#b45309':cat.color
              return (
                <div key={cat.id} className="ht-card" style={{ marginBottom:10, padding:16, cursor:'pointer' }}
                  onClick={() => { setBudgetModal(cat); setBudgetAmt(budget?String(budget.amount):'') }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:budget?10:0 }}>
                    <span style={{ fontSize:22 }}>{cat.icon}</span>
                    <div style={{ flex:1 }}>
                      <p style={{ fontWeight:700, fontSize:14 }}>{cat.name}</p>
                      <p style={{ fontSize:12, color:'var(--ht-text-3)' }}>{fmtShort(spent)}{budget?` de ${fmtShort(budget.amount)}`:' — sin meta'}</p>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      {budget
                        ? <span style={{ fontSize:12, fontWeight:800, color:barColor, background:`${barColor}15`, padding:'3px 8px', borderRadius:9999 }}>{pct}%</span>
                        : <span style={{ fontSize:11, fontWeight:700, color:'var(--ht-text-4)', background:'rgba(0,0,0,0.05)', padding:'3px 8px', borderRadius:9999 }}>Sin meta</span>
                      }
                      <Edit2 size={13} color="var(--ht-text-4)" />
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

      {/* ══ MODAL AGREGAR/EDITAR ══ */}
      {showAdd && (
        <>
          <div className="ht-overlay" onClick={() => setShowAdd(false)} />
          <div className="ht-modal">
            <div style={{ padding:'20px 16px 0' }}>
              <div style={{ width:36, height:4, background:'rgba(200,149,108,0.2)', borderRadius:9999, margin:'0 auto 16px' }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                <h2 style={{ fontSize:17, fontWeight:800 }}>{editTx?'Editar movimiento':'Nuevo movimiento'}</h2>
                <button onClick={() => setShowAdd(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--ht-text-3)', padding:4 }}><X size={20} /></button>
              </div>
            </div>
            <div style={{ padding:'0 16px 32px' }}>
              {/* Tipo + Monto siempre juntos y visibles */}
              <div style={{ display:'flex', gap:10, marginBottom:16, alignItems:'stretch' }}>
                {/* Tipo: columna izquierda */}
                <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0 }}>
                  {(['expense','income'] as const).map(t => (
                    <button key={t} onClick={() => setAddTypeAndSave(t)} style={{
                      flex:1, padding:'0 14px', borderRadius:12, border:'none', cursor:'pointer',
                      fontSize:13, fontWeight:800, whiteSpace:'nowrap',
                      background:addType===t?(t==='expense'?'#8B2020':'#3D6B42'):'rgba(0,0,0,0.05)',
                      color:addType===t?'white':'var(--ht-text-3)',
                      transition:'all 0.15s', minHeight:44,
                    }}>
                      {t==='expense'?'💸 Gasto':'💰 Ingreso'}
                    </button>
                  ))}
                </div>
                {/* Monto: bloque derecho */}
                <div style={{ position:'relative', flex:1 }}>
                  <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:18, fontWeight:900, color:'var(--ht-text-3)' }}>$</span>
                  <input type="number" placeholder="0" value={addAmount} onChange={e => setAddAmount(e.target.value)}
                    style={{ width:'100%', height:'100%', minHeight:100, padding:'12px 12px 12px 34px', border:'1.5px solid rgba(200,149,108,0.25)', borderRadius:16, fontSize:32, fontWeight:900, background:'rgba(255,255,255,0.85)', color:addType==='income'?'#3D6B42':'#8B2020', outline:'none', fontFamily:'var(--font-qs)', textAlign:'right' }}
                    autoFocus={!editTx} />
                </div>
              </div>
              {/* Categoría */}
              <p className="ht-section-label">Categoría</p>
              <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4, marginBottom:16 }}>
                {filteredCats.map(cat => (
                  <button key={cat.id} onClick={() => setAddCat(addCat===cat.id?'':cat.id)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, padding:'10px 12px', borderRadius:14, flexShrink:0, border:'none', background:addCat===cat.id?cat.color:'rgba(0,0,0,0.05)', cursor:'pointer', transition:'all 0.15s' }}>
                    <span style={{ fontSize:20 }}>{cat.icon}</span>
                    <span style={{ fontSize:10, fontWeight:700, color:addCat===cat.id?'white':'var(--ht-text-3)', whiteSpace:'nowrap' }}>{cat.name}</span>
                  </button>
                ))}
              </div>
              <input className="ht-input" placeholder="Descripción (opcional)" value={addDesc} onChange={e => setAddDesc(e.target.value)} style={{ marginBottom:12 }} />
              <input type="date" className="ht-input" value={addDate} onChange={e => setAddDate(e.target.value)} style={{ marginBottom:12 }} />
              {/* Visibilidad */}
              <p className="ht-section-label">¿Quiénes lo ven?</p>
              <div style={{ display:'grid', gridTemplateColumns:`repeat(${2 + members.filter(m=>m.profile_id!==profile?.id).length},1fr)`, gap:8, marginBottom:20 }}>
                {(['shared','private'] as const).map(v => {
                  const active = addVisib===v && !addSharedWith
                  return (
                    <button key={v} onClick={() => { setAddVisib(v); setAddSharedWith('') }} style={{ padding:'10px 8px', borderRadius:14, border:'none', background:active?'var(--ht-purple)':'rgba(0,0,0,0.05)', cursor:'pointer', textAlign:'center', transition:'all 0.15s' }}>
                      <div style={{ fontSize:18, marginBottom:4 }}>{v==='shared'?'👥':'🔒'}</div>
                      <p style={{ fontSize:11, fontWeight:700, color:active?'white':'var(--ht-text)' }}>{v==='shared'?'Todos':'Solo yo'}</p>
                    </button>
                  )
                })}
                {members.filter(m => m.profile_id !== profile?.id).map(m => {
                  const active = addSharedWith === m.profile_id
                  return (
                    <button key={m.profile_id} onClick={() => { setAddSharedWith(active?'':m.profile_id); setAddVisib('private') }} style={{ padding:'10px 8px', borderRadius:14, border:'none', background:active?'var(--ht-rose)':'rgba(0,0,0,0.05)', cursor:'pointer', textAlign:'center', transition:'all 0.15s' }}>
                      <div style={{ fontSize:18, marginBottom:4 }}>👤</div>
                      <p style={{ fontSize:11, fontWeight:700, color:active?'white':'var(--ht-text)' }}>+{m.profile?.name?.split(' ')[0]}</p>
                    </button>
                  )
                })}
              </div>
              <button onClick={saveTransaction} disabled={saving||!addAmount} className="ht-btn ht-btn-primary" style={{ width:'100%', padding:'13px' }}>
                {saving ? <><div className="ht-spinner" /> Guardando...</> : <><Check size={16} /> {editTx?'Guardar cambios':`Guardar ${addType==='income'?'ingreso':'gasto'}`}</>}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ══ MODAL META ══ */}
      {budgetModal && (
        <>
          <div className="ht-overlay" onClick={() => setBudgetModal(null)} />
          <div className="ht-modal">
            <div style={{ padding:'24px 16px 32px' }}>
              <div style={{ width:36, height:4, background:'rgba(200,149,108,0.2)', borderRadius:9999, margin:'0 auto 20px' }} />
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
                <div style={{ width:48, height:48, borderRadius:9999, background:`${budgetModal.color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>{budgetModal.icon}</div>
                <div>
                  <p style={{ fontWeight:800, fontSize:17 }}>{budgetModal.name}</p>
                  <p style={{ fontSize:13, color:'var(--ht-text-3)' }}>Meta mensual</p>
                </div>
              </div>
              <div style={{ position:'relative', marginBottom:20 }}>
                <span style={{ position:'absolute', left:16, top:'50%', transform:'translateY(-50%)', fontSize:20, fontWeight:900, color:'var(--ht-text-3)' }}>$</span>
                <input type="number" placeholder="0" value={budgetAmt} onChange={e => setBudgetAmt(e.target.value)}
                  style={{ width:'100%', padding:'14px 16px 14px 36px', border:`1.5px solid ${budgetModal.color}40`, borderRadius:9999, fontSize:26, fontWeight:900, background:'rgba(255,255,255,0.8)', color:budgetModal.color, outline:'none', fontFamily:'var(--font-qs)' }}
                  autoFocus />
              </div>
              <div style={{ display:'flex', gap:8 }}>
                {budgets.find(b=>b.category_id===budgetModal.id) && (
                  <button onClick={() => { deleteBudget(budgetModal.id); setBudgetModal(null) }} className="ht-btn ht-btn-danger" style={{ flex:1 }}><Trash2 size={14} /> Quitar</button>
                )}
                <button onClick={saveBudget} disabled={savingBudget||!budgetAmt} className="ht-btn ht-btn-primary" style={{ flex:2 }}>
                  {savingBudget ? <><div className="ht-spinner" /> Guardando...</> : <><Target size={15} /> Guardar meta</>}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══ MODAL CATEGORÍAS ══ */}
      {showSettings && (
        <>
          <div className="ht-overlay" onClick={() => setShowSettings(false)} />
          <div className="ht-modal">
            <div style={{ padding:'20px 16px 0' }}>
              <div style={{ width:36, height:4, background:'rgba(200,149,108,0.2)', borderRadius:9999, margin:'0 auto 16px' }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <h2 style={{ fontSize:17, fontWeight:800 }}>Categorías</h2>
                <button onClick={() => setShowSettings(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--ht-text-3)', padding:4 }}><X size={20} /></button>
              </div>
            </div>
            <div style={{ padding:'0 16px 32px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
                {(['expense','income'] as const).map(t => (
                  <button key={t} onClick={() => setNewCatType(t)} style={{ padding:'8px', borderRadius:9999, border:'none', background:newCatType===t?'var(--ht-purple)':'rgba(0,0,0,0.05)', fontSize:13, fontWeight:700, cursor:'pointer', color:newCatType===t?'white':'var(--ht-text-3)' }}>
                    {t==='expense'?'Gasto':'Ingreso'}
                  </button>
                ))}
              </div>
              <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                <input value={newCatIcon} onChange={e => setNewCatIcon(e.target.value)} style={{ width:52, border:'1.5px solid rgba(200,149,108,0.2)', borderRadius:12, textAlign:'center', fontSize:20, padding:'8px 4px', background:'rgba(255,255,255,0.8)', outline:'none' }} maxLength={2} />
                <input className="ht-input" placeholder="Nombre de categoría" value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => e.key==='Enter'&&addCategory()} />
                <button onClick={addCategory} disabled={!newCatName.trim()} className="ht-btn ht-btn-primary" style={{ flexShrink:0, padding:'9px 14px' }}><Plus size={15} /></button>
              </div>
              <div style={{ maxHeight:'50vh', overflowY:'auto' }}>
                {categories.map(cat => (
                  <div key={cat.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:12, background:'rgba(255,255,255,0.6)', marginBottom:6 }}>
                    <span style={{ fontSize:20 }}>{cat.icon}</span>
                    <div style={{ flex:1 }}>
                      <p style={{ fontWeight:700, fontSize:14 }}>{cat.name}</p>
                      <p style={{ fontSize:11, color:'var(--ht-text-3)', textTransform:'capitalize' }}>{cat.type==='income'?'Ingreso':'Gasto'}</p>
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

      {/* ══ MODAL IMPORTAR ══ */}
      {showImport && profile && (
        <ImportExcelModal
          householdId={household!.id}
          profileId={profile.id}
          members={members.map(m => ({ profile_id: m.profile_id, name: m.profile?.name ?? 'Miembro' }))}
          categories={categories}
          onClose={() => setShowImport(false)}
          onImported={(firstDate?: string) => {
            setShowImport(false)
            setTab('movimientos')
            if (firstDate) {
              const d = new Date(firstDate + 'T12:00:00')
              setYear(d.getFullYear())
              setMonth(d.getMonth())
            }
            setRefreshKey(k => k + 1)
          }}
        />
      )}
    </div>
  )
}

// Wrap with Suspense for useSearchParams
export default function FinancesPage() {
  return (
    <Suspense fallback={<div className="ht-page" style={{ paddingTop:60, textAlign:'center', color:'var(--ht-text-3)' }}><div className="ht-spinner ht-spinner-dark" style={{ margin:'0 auto' }} /></div>}>
      <FinancesInner />
    </Suspense>
  )
}
