'use client'

import { AuthProvider } from '@/contexts/AuthContext'
import BottomNav from '@/components/BottomNav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <main style={{ minHeight: '100dvh', background: 'var(--ht-bg)' }}>
        {children}
      </main>
      <BottomNav />
    </AuthProvider>
  )
}
