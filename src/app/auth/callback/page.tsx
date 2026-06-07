'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CallbackPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')

    async function handleCallback() {
      if (code) {
        // PKCE flow: exchange code client-side (needs localStorage code_verifier)
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          router.replace('/login')
          return
        }
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace('/dashboard')
      } else {
        router.replace('/login')
      }
    }

    handleCallback()
  }, [])

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: '#fafafa', flexDirection: 'column', gap: 12,
    }}>
      <div className="ht-spinner" style={{ width: 28, height: 28 }} />
      <p style={{ color: '#6b7280', fontSize: 14 }}>Verificando sesión...</p>
    </div>
  )
}
