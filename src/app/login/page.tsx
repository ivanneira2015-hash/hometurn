'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Calendar, CheckSquare, Vote, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleGoogleLogin() {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>

      {/* Top — dark hero */}
      <div style={{
        background: '#18181b',
        flex: '0 0 auto',
        padding: '48px 24px 40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        {/* Logo mark */}
        <div style={{
          width: 64, height: 64, borderRadius: 20,
          background: 'linear-gradient(135deg, #6366f1, #818cf8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
          boxShadow: '0 0 0 1px rgba(99,102,241,0.3), 0 8px 32px rgba(99,102,241,0.3)',
        }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M7 26V14l9-8 9 8v12H20v-7h-8v7H7Z" fill="white" opacity="0.9"/>
            <path d="M12 26v-5h8v5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>

        <h1 style={{ fontSize: 34, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', marginBottom: 10 }}>
          HomeTurn
        </h1>
        <p style={{ fontSize: 15, color: '#a1a1aa', textAlign: 'center', maxWidth: 260, lineHeight: 1.5 }}>
          Las tareas del hogar, organizadas. Sin discusiones.
        </p>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 24, marginTop: 32 }}>
          {[
            { value: 'Lun–Vie', label: 'Calendario' },
            { value: '3/3', label: 'Votos' },
            { value: '∞', label: 'Listas' },
          ].map(({ value, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#818cf8' }}>{value}</p>
              <p style={{ fontSize: 11, color: '#71717a', fontWeight: 500 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom — white card */}
      <div style={{
        flex: 1,
        background: '#fafafa',
        borderRadius: '24px 24px 0 0',
        marginTop: -12,
        padding: '28px 24px 40px',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: 480,
        width: '100%',
        margin: '-12px auto 0',
      }}>

        {/* Feature list */}
        <div style={{ marginBottom: 28 }}>
          {[
            { icon: Calendar, text: 'Calendario semanal con restricciones por horario', color: '#6366f1', bg: '#eef2ff' },
            { icon: CheckSquare, text: 'Listas de compras y pendientes compartidas', color: '#10b981', bg: '#d1fae5' },
            { icon: Vote, text: 'Votación grupal para cambiar cualquier tarea', color: '#f97316', bg: '#fff7ed' },
          ].map(({ icon: Icon, text, color, bg }) => (
            <div key={text} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 0',
              borderBottom: '1px solid #f3f4f6',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: bg, display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon size={17} color={color} strokeWidth={2} />
              </div>
              <span style={{ fontSize: 14, color: '#374151', lineHeight: 1.4 }}>{text}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: '100%', padding: '14px 20px',
            background: loading ? '#f3f4f6' : '#18181b',
            border: 'none', borderRadius: 12,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontSize: 15, fontWeight: 700,
            color: loading ? '#9ca3af' : '#fff',
            transition: 'background 0.15s',
            marginBottom: 12,
          }}
        >
          {loading ? (
            <div className="ht-spinner" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {loading ? 'Ingresando...' : 'Continuar con Google'}
          {!loading && <ArrowRight size={16} />}
        </button>

        <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
          Solo para uso familiar · Compartís con los integrantes del hogar
        </p>
      </div>
    </div>
  )
}
