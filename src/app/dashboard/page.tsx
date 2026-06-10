'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { WeeklyAssignment, CalendarEvent, Notification } from '@/lib/types'
import { getWeekStart, getTodayDayOfWeek, DAY_LABELS_FULL } from '@/lib/dates'
import {
  CheckCircle2, Circle, CalendarDays, TrendingUp, CalendarRange,
  CheckSquare, Sparkles, ArrowRight, Gift, Clock
} from 'lucide-react'
import { MEMBER_GRAD, MEMBER_GLOW, MEMBER_SOLID } from '@/lib/colors'

// ── Animated counter hook ──────────────────────────────
function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0)
  const ref = useRef<NodeJS.Timeout | null>(null)
  useEffect(() => {
    if (ref.current) clearInterval(ref.current)
    if (target === 0) { setValue(0); return }
    const start = Date.now()
    ref.current = setInterval(() => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setValue(Math.round(target * eased))
      if (progress >= 1) { clearInterval(ref.current!); setValue(target) }
    }, 16)
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [target])
  return value
}

const fmtShort = (n: number) => {
  if (Math.abs(n) >= 1000000) return `$${(n/1000000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `$${(n/1000).toFixed(0)}k`
  return `$${Math.round(n).toLocaleString('es-AR')}`
}

const HUB_MODULES = [
  { href:'/dashboard/schedule', icon:CalendarDays,  label:'Semana',   desc:'Tareas del hogar',        color:'#C8956C' },
  { href:'/dashboard/finances', icon:TrendingUp,    label:'Finanzas', desc:'Gastos e ingresos',        color:'#7A8A5E' },
  { href:'/dashboard/agenda',   icon:CalendarRange, label:'Agenda',   desc:'Eventos y recordatorios',  color:'#A67552' },
  { href:'/dashboard/tasks',    icon:CheckSquare,   label:'Listas',   desc:'Compras y pendientes',     color:'#5D6B45' },
]

export default function DashboardPage() {
  const { user, profile, household, members, loading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [myTasks,      setMyTasks]      = useState<WeeklyAssignment[]>([])
  const [allTasks,     setAllTasks]     = useState<{profile_id:string; completed:boolean}[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)
  const [monthBalance, setMonthBalance] = useState({ income: 0, expense: 0 })
  const [nextEvent,    setNextEvent]    = useState<CalendarEvent | null>(null)
  const [recentActivity, setRecentActivity] = useState<Notification[]>([])
  const [upcomingBday, setUpcomingBday] = useState<CalendarEvent | null>(null)

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/login'); return }
    if (!household) { router.replace('/dashboard/onboarding'); return }
    loadAll()
  }, [loading, user, household])

  async function loadAll() {
    const now = new Date()
    const startDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
    const endDate = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().split('T')[0]
    const todayStr = now.toISOString().split('T')[0]

    const [
      { data: myData },
      { data: allData },
      { data: txData },
      { data: evData },
      { data: notifData },
    ] = await Promise.all([
      supabase.from('weekly_assignments').select('*, chore:chore_definitions(*)')
        .eq('profile_id', user!.id).eq('week_start', getWeekStart()).order('day_of_week'),
      supabase.from('weekly_assignments').select('profile_id, completed')
        .eq('household_id', household!.id).eq('week_start', getWeekStart()),
      supabase.from('transactions').select('amount,type')
        .eq('household_id', household!.id).gte('date', startDate).lte('date', endDate)
        .or(`visibility.eq.shared,profile_id.eq.${user!.id}`),
      supabase.from('calendar_events').select('*')
        .eq('household_id', household!.id)
        .or(`visibility.eq.shared,profile_id.eq.${user!.id}`)
        .gte('date', todayStr).order('date').limit(20),
      supabase.from('notifications').select('*, from_profile:from_profile_id(name)')
        .eq('household_id', household!.id).order('created_at', { ascending: false }).limit(5),
    ])

    setMyTasks(myData ?? [])
    setAllTasks(allData ?? [])
    setTasksLoading(false)

    const income  = (txData ?? []).filter(t => t.type === 'income').reduce((s,t)  => s + Number(t.amount), 0)
    const expense = (txData ?? []).filter(t => t.type === 'expense').reduce((s,t) => s + Number(t.amount), 0)
    setMonthBalance({ income, expense })

    // Next event (excluding birthdays shown separately)
    const upcomingEvents = (evData ?? []).filter(e => e.type !== 'birthday')
    setNextEvent(upcomingEvents[0] ?? null)

    // Upcoming birthday in 7 days
    const allEvents = evData ?? []
    const bday = allEvents.find(e => {
      if (e.type !== 'birthday' || !e.is_recurring) return false
      const orig = new Date(e.date + 'T12:00:00')
      for (let i = 0; i <= 7; i++) {
        const d = new Date(now); d.setDate(now.getDate() + i)
        if (orig.getMonth() === d.getMonth() && orig.getDate() === d.getDate()) return true
      }
      return false
    })
    setUpcomingBday(bday ?? null)
    setRecentActivity((notifData ?? []) as Notification[])
  }

  async function toggleComplete(id: string, current: boolean) {
    await supabase.from('weekly_assignments').update({ completed: !current }).eq('id', id)
    setMyTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !current } : t))
  }

  // Hooks ANTES de cualquier early return
  const completed  = myTasks.filter(t => t.completed).length
  const total      = myTasks.length
  const percent    = total > 0 ? Math.round((completed / total) * 100) : 0
  const animPercent = useCountUp(percent)

  if (loading) return <LoadingSkeleton />
  if (!user || !profile || !household) return null

  const today      = getTodayDayOfWeek()
  const todayLabel = today ? DAY_LABELS_FULL[today] : 'Hoy'
  const todayTasks = today ? myTasks.filter(t => t.day_of_week === today) : []
  const balance    = monthBalance.income - monthBalance.expense

  const hour = new Date().getHours()
  const greeting      = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
  const greetingEmoji = hour < 12 ? '🌅' : hour < 19 ? '☀️' : '🌙'

  // Progress per member
  const memberProgress = members.map(m => {
    const memberTasks = allTasks.filter(t => t.profile_id === m.profile_id)
    const done = memberTasks.filter(t => t.completed).length
    const tot  = memberTasks.length
    return { ...m, done, total: tot, pct: tot > 0 ? Math.round((done/tot)*100) : 0 }
  })

  return (
    <div>
      {/* Header */}
      <div style={{ padding:'28px 60px 16px 16px', background:'var(--ht-surface)', borderBottom:'1px solid var(--ht-outline-variant)', position:'sticky', top:0, zIndex:10 }}>
        <p style={{ fontSize:12, color:'var(--ht-text-3)', fontWeight:600, marginBottom:2 }}>{greetingEmoji} {greeting}</p>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h1 style={{ fontSize:28, fontWeight:900, letterSpacing:'-0.03em' }}>
            <span className="ht-gradient-text">{profile.name.split(' ')[0]}</span>
          </h1>
          <div style={{ width:44, height:44, borderRadius:9999, overflow:'hidden', background:MEMBER_GRAD[0], display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, fontWeight:900, color:'white', boxShadow:MEMBER_GLOW[0], flexShrink:0 }}>
            {profile.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : profile.name[0].toUpperCase()}
          </div>
        </div>
      </div>

      <div className="ht-page" style={{ paddingTop:16 }}>

        {/* ── Birthday reminder ── */}
        {upcomingBday && (() => {
          const orig = new Date(upcomingBday.date + 'T12:00:00')
          const now2 = new Date()
          const isToday = orig.getMonth()===now2.getMonth()&&orig.getDate()===now2.getDate()
          const daysUntil = isToday ? 0 : Array.from({length:8},(_,i)=>{const d=new Date(now2);d.setDate(now2.getDate()+i);return orig.getMonth()===d.getMonth()&&orig.getDate()===d.getDate()?i:null}).find(x=>x!==null)??0
          return (
            <div className="ht-card ht-card-rose" style={{ marginBottom:12, display:'flex', alignItems:'center', gap:12, padding:'14px 16px' }}>
              <span style={{ fontSize:28 }}>🎂</span>
              <div style={{ flex:1 }}>
                <p style={{ fontWeight:800, fontSize:14 }}>{upcomingBday.title}</p>
                <p style={{ fontSize:12, color:'var(--ht-rose)', fontWeight:600 }}>{isToday?'¡Hoy es su cumpleaños!':`En ${daysUntil} día${daysUntil>1?'s':''}`}</p>
              </div>
              {isToday && <span style={{ fontSize:24 }}>🎉</span>}
            </div>
          )
        })()}

        {/* ── Bento: Progress + % animado ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 80px', gap:10, marginBottom:10 }}>
          <div className="ht-card ht-card-purple" style={{ padding:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:12 }}>
              <div style={{ width:26, height:26, borderRadius:9999, background:'var(--ht-grad)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <CalendarDays size={13} color="white" strokeWidth={2.5} />
              </div>
              <span style={{ fontWeight:800, fontSize:12, color:'var(--ht-purple)' }}>Semana actual</span>
            </div>
            <div style={{ height:10, background:'rgba(200,149,108,0.12)', borderRadius:9999, overflow:'hidden', marginBottom:8 }}>
              <div style={{ height:'100%', width:`${percent}%`, background:percent===100?'linear-gradient(90deg,#047857,#059669)':'var(--ht-grad)', borderRadius:9999, transition:'width 0.6s cubic-bezier(0.16,1,0.3,1)' }} />
            </div>
            <p style={{ fontSize:12, color:'var(--ht-purple)', fontWeight:600, opacity:0.7 }}>
              {percent===100?'¡Semana completada!':`${completed} de ${total} tareas`}
            </p>
          </div>
          <div className="ht-card" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:percent===100?'rgba(4,120,87,0.1)':'linear-gradient(135deg,rgba(200,149,108,0.1),rgba(190,24,93,0.06))', border:`1px solid ${percent===100?'rgba(4,120,87,0.2)':'rgba(200,149,108,0.15)'}`, padding:0, minHeight:84 }}>
            <span style={{ fontSize:30, fontWeight:900, letterSpacing:'-0.04em', lineHeight:1, background:percent===100?'linear-gradient(135deg,#047857,#059669)':'var(--ht-grad)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
              {animPercent}
            </span>
            <span style={{ fontSize:11, fontWeight:800, color:'var(--ht-text-3)', marginTop:1 }}>%</span>
          </div>
        </div>

        {/* ── Bento: Balance mes + Próximo evento ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
          <Link href="/dashboard/finances" style={{ textDecoration:'none' }}>
            <div className="ht-card" style={{ padding:14, height:'100%', background:balance>=0?'rgba(4,120,87,0.07)':'rgba(190,24,93,0.07)', border:`1px solid ${balance>=0?'rgba(4,120,87,0.15)':'rgba(139,32,32,0.15)'}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:6 }}>
                <TrendingUp size={12} color={balance>=0?'#3D6B42':'#8B2020'} />
                <span style={{ fontSize:10, fontWeight:700, color:'var(--ht-text-3)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Este mes</span>
              </div>
              <p style={{ fontSize:18, fontWeight:900, color:balance>=0?'#3D6B42':'#8B2020', letterSpacing:'-0.02em' }}>{balance>=0?'+':''}{fmtShort(balance)}</p>
              <p style={{ fontSize:10, color:'var(--ht-text-4)', marginTop:3, fontWeight:500 }}>
                ↑ {fmtShort(monthBalance.income)} · ↓ {fmtShort(monthBalance.expense)}
              </p>
            </div>
          </Link>

          <Link href="/dashboard/agenda" style={{ textDecoration:'none' }}>
            <div className="ht-card" style={{ padding:14, height:'100%', background:'rgba(124,58,237,0.06)', border:'1px solid rgba(200,149,108,0.12)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:6 }}>
                <CalendarRange size={12} color="var(--ht-purple)" />
                <span style={{ fontSize:10, fontWeight:700, color:'var(--ht-text-3)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Próximo evento</span>
              </div>
              {nextEvent ? (
                <>
                  <p style={{ fontSize:13, fontWeight:800, color:'var(--ht-text)', lineHeight:1.3, marginBottom:3 }}>{nextEvent.title}</p>
                  <p style={{ fontSize:10, color:'var(--ht-purple)', fontWeight:600 }}>
                    {new Date(nextEvent.date+'T12:00:00').toLocaleDateString('es-AR',{weekday:'short',day:'numeric',month:'short'})}
                  </p>
                </>
              ) : (
                <p style={{ fontSize:12, color:'var(--ht-text-4)', fontWeight:500 }}>Sin eventos próximos</p>
              )}
            </div>
          </Link>
        </div>

        {/* ── Progreso por integrante ── */}
        <div style={{ marginBottom:12 }}>
          <p className="ht-section-label">Progreso semanal</p>
          {memberProgress.map((m, i) => (
            <div key={m.id} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
              <div style={{ width:32, height:32, borderRadius:9999, background:MEMBER_GRAD[i%5], display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, color:'white', overflow:'hidden', flexShrink:0, boxShadow:`0 3px 8px ${MEMBER_GLOW[i%5]}` }}>
                {m.profile?.avatar_url ? <img src={m.profile.avatar_url} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }} /> : m.profile?.name?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:'var(--ht-text)' }}>{m.profile?.name?.split(' ')[0]}</span>
                  <span style={{ fontSize:11, fontWeight:800, color:MEMBER_SOLID[i%5] }}>{m.done}/{m.total}</span>
                </div>
                <div style={{ height:5, background:'rgba(0,0,0,0.06)', borderRadius:9999, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${m.pct}%`, background:MEMBER_GRAD[i%5], borderRadius:9999, transition:'width 0.6s ease' }} />
                </div>
              </div>
              {m.pct===100 && <span style={{ fontSize:16 }}>⭐</span>}
            </div>
          ))}
        </div>

        {/* ── Tareas de hoy ── */}
        <div style={{ marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
            <p className="ht-section-label" style={{ marginBottom:0 }}>{todayLabel}</p>
            {todayTasks.filter(t=>!t.completed).length>0 && (
              <span style={{ fontSize:11, fontWeight:700, color:'var(--ht-rose)', background:'var(--ht-rose-light)', padding:'2px 8px', borderRadius:9999 }}>
                {todayTasks.filter(t=>!t.completed).length} pendientes
              </span>
            )}
          </div>
          {tasksLoading ? (
            <div className="ht-card" style={{ height:64, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div className="ht-spinner ht-spinner-dark" />
            </div>
          ) : todayTasks.length===0 ? (
            <div className="ht-card" style={{ textAlign:'center', padding:'18px 16px' }}>
              <Sparkles size={18} color="rgba(200,149,108,0.3)" style={{ margin:'0 auto 6px', display:'block' }} />
              <p style={{ fontSize:14, color:'var(--ht-text-3)', fontWeight:600 }}>Sin tareas asignadas hoy</p>
            </div>
          ) : todayTasks.slice(0,3).map(task => (
            <button key={task.id} onClick={() => toggleComplete(task.id,task.completed)} className="ht-list-item"
              style={{ width:'100%', cursor:'pointer', textAlign:'left', background:task.completed?'rgba(4,120,87,0.07)':'var(--ht-glass-warm)', border:`1px solid ${task.completed?'rgba(4,120,87,0.18)':'var(--ht-glass-border)'}` }}>
              {task.completed ? <CheckCircle2 size={22} color="#047857" /> : <Circle size={22} color="rgba(200,149,108,0.2)" />}
              <div style={{ flex:1 }}>
                <p style={{ fontWeight:800, fontSize:14, color:task.completed?'var(--ht-text-3)':'var(--ht-text)', textDecoration:task.completed?'line-through':'none' }}>{task.chore?.name}</p>
                <p style={{ fontSize:12, color:'var(--ht-text-3)', textTransform:'capitalize', fontWeight:500 }}>{task.chore?.category}</p>
              </div>
            </button>
          ))}
          {todayTasks.length>3 && (
            <Link href="/dashboard/schedule" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'10px', fontSize:13, fontWeight:700, color:'var(--ht-purple)', textDecoration:'none' }}>
              Ver todas ({todayTasks.length}) <ArrowRight size={13} />
            </Link>
          )}
        </div>

        {/* ── Hub módulos ── */}
        <p className="ht-section-label">Módulos</p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
          {HUB_MODULES.map(({ href, icon:Icon, label, desc, color }) => (
            <Link key={href} href={href} style={{ textDecoration:'none' }}>
              <div style={{
                padding:'20px 16px 16px',
                background:'var(--ht-surface)',
                border:'1px solid var(--ht-outline-variant)',
                borderRadius:'var(--ht-r-lg)',
                boxShadow:'var(--ht-shadow-sm)',
                cursor:'pointer',
                transition:'box-shadow 0.15s, transform 0.15s',
                /* Acento sutil: línea izquierda del color del módulo */
                borderLeft:`3px solid ${color}`,
              }}>
                <Icon size={24} color={color} strokeWidth={1.8} style={{ marginBottom:12, display:'block' }} />
                <p style={{ fontWeight:800, fontSize:14, color:'var(--ht-text)', marginBottom:3, letterSpacing:'-0.01em' }}>{label}</p>
                <p style={{ fontSize:11, color:'var(--ht-text-3)', fontWeight:500 }}>{desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* ── Actividad reciente ── */}
        {recentActivity.length > 0 && (
          <div>
            <p className="ht-section-label">Actividad reciente</p>
            {recentActivity.map(n => {
              const icons: Record<string,string> = { transaction:'💸', task_completed:'✅', event:'📅', assignment:'📋' }
              const timeAgo = (s: string) => { const d=(Date.now()-new Date(s).getTime())/1000; return d<60?'ahora':d<3600?`${Math.floor(d/60)}m`:d<86400?`${Math.floor(d/3600)}h`:`${Math.floor(d/86400)}d` }
              return (
                <div key={n.id} style={{ display:'flex', gap:10, padding:'10px 14px', borderRadius:14, background:'var(--ht-glass-warm)', border:'1px solid var(--ht-glass-border)', marginBottom:6, alignItems:'flex-start' }}>
                  <span style={{ fontSize:18, flexShrink:0, marginTop:1 }}>{icons[n.type]??'🔔'}</span>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:13, fontWeight:700, color:'var(--ht-text)' }}>{n.title}</p>
                    {n.body && <p style={{ fontSize:12, color:'var(--ht-text-3)' }}>{n.body}</p>}
                  </div>
                  <span style={{ fontSize:10, color:'var(--ht-text-4)', fontWeight:600, flexShrink:0 }}>{timeAgo(n.created_at)}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div>
      <div style={{ height:88, background:'rgba(253,244,255,0.75)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,0.5)' }} />
      <div className="ht-page" style={{ paddingTop:16 }}>
        {[100,84,84,72,200].map((h,i) => (
          <div key={i} style={{ height:h, background:'rgba(255,255,255,0.5)', borderRadius:24, marginBottom:10 }} />
        ))}
      </div>
    </div>
  )
}
