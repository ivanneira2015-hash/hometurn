'use client'

import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import BottomNav from '@/components/BottomNav'
import NotificationBell from '@/components/NotificationBell'

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user, household } = useAuth()
  return (
    <>
      <main style={{ minHeight: '100dvh', position: 'relative' }}>
        {/* Global notification bell — top right */}
        <div style={{
          position: 'fixed', top: 16, right: 16, zIndex: 20,
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
