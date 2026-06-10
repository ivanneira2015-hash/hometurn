'use client'

import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import BottomNav from '@/components/BottomNav'
import NotificationBell from '@/components/NotificationBell'

// La campana se integra en el header de cada página via este wrapper
// Para evitar superposición, cada página ya tiene padding-right en su header
function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user, household } = useAuth()
  return (
    <>
      <main style={{ minHeight: '100dvh' }}>
        {/* Campana fija — arriba derecha, NO superpone porque los headers tienen padding-right: 52px */}
        <div style={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 15,
        }}>
          <NotificationBell userId={user?.id} householdId={household?.id} />
        </div>
        {children}
      </main>
      <BottomNav />
    </>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardContent>{children}</DashboardContent>
    </AuthProvider>
  )
}
