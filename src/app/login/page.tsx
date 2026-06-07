'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
      minHeight: '100dvh',
      background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      {/* Decorative circles */}
      <div style={{
        position: 'absolute', top: -60, right: -60, width: 200, height: 200,
        borderRadius: '50%', background: 'rgba(255,255,255,0.07)',
      }} />
      <div style={{
        position: 'absolute', bottom: -80, left: -40, width: 260, height: 260,
        borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
      }} />

      <div style={{ position: 'relative', textAlign: 'center', maxWidth: 360, width: '100%' }}>
        {/* Logo */}
        <div style={{
          width: 80, height: 80, borderRadius: 24, background: 'rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', fontSize: 40, backdropFilter: 'blur(10px)',
        }}>
          🏠
        </div>

        <h1 style={{ color: 'white', fontSize: 36, fontWeight: 800, marginBottom: 8 }}>
          HomeTurn
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, marginBottom: 40 }}>
          Organizá las tareas del hogar{'\n'}con tu familia, sin discusiones
        </p>

        {/* Features */}
        <div style={{
          background: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: 20,
          marginBottom: 32, backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.2)',
        }}>
          {[
            ['📅', 'Calendario semanal Lun–Vie'],
            ['🔄', 'Rotación automática de tareas'],
            ['🗳️', 'Votación para cambios'],
            ['✅', 'Listas de compras y pendientes'],
          ].map(([icon, text]) => (
            <div key={text} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              color: 'white', fontSize: 14, padding: '6px 0',
            }}>
              <span style={{ fontSize: 20 }}>{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>

        {/* Google Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: '100%', padding: '14px 24px',
            background: 'white', borderRadius: 12, border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            fontSize: 16, fontWeight: 700, color: '#1e1b4b',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            transition: 'transform 0.15s',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? 'Ingresando...' : 'Entrar con Google'}
        </button>

        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 16 }}>
          Al entrar aceptás compartir tus tareas con los demás integrantes del hogar
        </p>
      </div>
    </div>
  )
}
