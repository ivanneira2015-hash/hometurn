import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Ensure profile exists (in case trigger was slow or failed)
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: data.user.email!,
        name: data.user.user_metadata?.full_name ?? data.user.email!.split('@')[0],
        avatar_url: data.user.user_metadata?.avatar_url ?? null,
        color: '#6366f1',
      }, { onConflict: 'id', ignoreDuplicates: true })
    }
  }

  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocal = process.env.NODE_ENV === 'development'
  const base = isLocal ? origin : forwardedHost ? `https://${forwardedHost}` : origin

  return NextResponse.redirect(`${base}/dashboard`)
}
