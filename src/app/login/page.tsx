'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Home, Calendar, CheckSquare, Vote } from 'lucide-react'

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
    <div style={{
      minHeight: '100dvh', background: '#fafafa',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: '#6366f1', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Home size={28} color="white" strokeWidth={2} />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', marginBottom: 6 }}>
            HomeTurn
          </h1>
          <p style={{ fontSize: 15, color: '#6b7280' }}>
            Organizá las tareas del hogar en familia
          </p>
        </div>

        {/* Features */}
        <div style={{
          background: '#fff', border: '1px solid #e5e7eb',
          borderRadius: 16, padding: 20, marginBottom: 24,
        }}>
          {[
            { icon: Calendar, text: 'Calendario semanal Lun–Vie por persona' },
            { icon: CheckSquare, text: 'Listas de compras y tareas compartidas' },
            { icon: Vote, text: 'Votación grupal para cambiar tareas' },
            { icon: Home, text: 'Restricciones por horario de cada integrante' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '8px 0', borderBottom: '1px solid #f3f4f6',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: '#eef2ff', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon size={16} color="#6366f1" strokeWidth={2} />
              </div>
              <span style={{ fontSize: 14, color: '#374151' }}>{text}</span>
            </div>
          ))}
        </div>

        {/* Google Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: '100%', padding: '13px 20px',
            background: loading ? '#f3f4f6' : '#fff',
            border: '1.5px solid #e5e7eb',
            borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontSize: 15, fontWeight: 600, color: '#111827',
            transition: 'background 0.15s',
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
        </button>

        <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 16 }}>
          Solo para uso familiar. Compartís tareas con los integrantes del hogar.
        </p>
      </div>
    </div>
  )
}
