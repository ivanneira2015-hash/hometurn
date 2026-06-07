'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, CheckSquare, Vote, User, Home } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', icon: Home, label: 'Inicio' },
  { href: '/dashboard/schedule', icon: CalendarDays, label: 'Semana' },
  { href: '/dashboard/tasks', icon: CheckSquare, label: 'Listas' },
  { href: '/dashboard/votes', icon: Vote, label: 'Votos' },
  { href: '/dashboard/profile', icon: User, label: 'Perfil' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="ht-bottom-nav">
      {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
        return (
          <Link key={href} href={href} className={`ht-nav-item ${active ? 'active' : ''}`}>
            <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
