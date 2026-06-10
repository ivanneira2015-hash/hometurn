'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Notification } from '@/lib/types'

export function useNotifications(userId: string | undefined, householdId: string | undefined) {
  const supabase = createClient()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  // Canal único por instancia del hook para evitar conflicto de suscripciones múltiples
  const channelId = useRef(`notif-${Math.random().toString(36).slice(2)}`)

  const load = useCallback(async () => {
    if (!userId || !householdId) return
    const { data } = await supabase
      .from('notifications')
      .select('*, from_profile:from_profile_id(name, avatar_url)')
      .eq('for_profile_id', userId)
      .eq('household_id', householdId)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications((data ?? []) as Notification[])
    setUnreadCount((data ?? []).filter(n => !n.read).length)
  }, [userId, householdId])

  useEffect(() => { load() }, [load])

  // Realtime subscription
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(channelId.current)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `for_profile_id=eq.${userId}`,
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev])
        setUnreadCount(c => c + 1)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  async function markAllRead() {
    if (!userId || !householdId) return
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('for_profile_id', userId)
      .eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  async function markRead(id: string) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(c => Math.max(0, c - 1))
  }

  return { notifications, unreadCount, markAllRead, markRead, reload: load }
}
