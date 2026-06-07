'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    // With implicit flow, detectSessionInUrl picks up tokens from the URL hash
    // onAuthStateChange fires with SIGNED_IN once the session is detected
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        router.replace('/dashboard')
      }
    })

    // Fallback: if session already exists (e.g. re-visit), go straight to dashboard
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard')
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: '#fafafa', gap: 12,
    }}>
      <div className="ht-spinner" style={{ width: 28, height: 28 }} />
      <p style={{ color: '#6b7280', fontSize: 14 }}>Iniciando sesión...</p>
    </div>
  )
}
