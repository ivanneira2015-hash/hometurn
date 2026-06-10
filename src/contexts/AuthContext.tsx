'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Profile, Household, HouseholdMember } from '@/lib/types'

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  household: Household | null
  members: HouseholdMember[]
  loading: boolean
  refreshHousehold: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null, profile: null, household: null, members: [],
  loading: true, refreshHousehold: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [household, setHousehold] = useState<Household | null>(null)
  const [members, setMembers] = useState<HouseholdMember[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  async function loadProfile(u: User): Promise<Profile | null> {
    const displayName = u.user_metadata?.full_name ?? u.user_metadata?.name ?? u.email?.split('@')[0] ?? 'Usuario'

    // 1. Intentar insertar (si ya existe, ignora el error de conflicto)
    await supabase.from('profiles').upsert({
      id: u.id,
      email: u.email ?? `${u.id}@unknown.com`,
      nombre: displayName,
      name: displayName,
      avatar_url: u.user_metadata?.avatar_url ?? null,
      color: '#7c3aed',
    }, { onConflict: 'id', ignoreDuplicates: true })

    // 2. Siempre fetchear por separado (sin encadenar al upsert)
    const { data } = await supabase.from('profiles').select('*').eq('id', u.id).single()
    return data
  }

  async function loadHousehold(userId: string) {
    const { data: memberRow } = await supabase
      .from('household_members').select('household_id')
      .eq('profile_id', userId).single()
    if (!memberRow) return

    const [{ data: hh }, { data: mbrs }] = await Promise.all([
      supabase.from('households').select('*').eq('id', memberRow.household_id).single(),
      supabase.from('household_members').select('*, profile:profiles(*)')
        .eq('household_id', memberRow.household_id),
    ])
    if (hh) setHousehold(hh)
    if (mbrs) setMembers(mbrs as HouseholdMember[])
  }

  async function refreshHousehold() {
    if (user) await loadHousehold(user.id)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        const prof = await loadProfile(u)
        setProfile(prof)
        await loadHousehold(u.id)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        const prof = await loadProfile(u)
        setProfile(prof)
        await loadHousehold(u.id)
      } else {
        setProfile(null)
        setHousehold(null)
        setMembers([])
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, household, members, loading, refreshHousehold }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
