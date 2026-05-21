'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ThemeToggle from './ThemeToggle'
import { LayoutDashboard, Zap, Database } from 'lucide-react'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/generate', label: 'Generate', icon: Zap },
  { href: '/leads', label: 'Leads', icon: Database },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200/80 dark:border-white/[0.06] bg-white/95 dark:bg-[#0e1117]/95 backdrop-blur-md">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" />

      <div className="w-full px-6 lg:px-10 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-shadow">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-900 dark:text-white text-[17px] tracking-tight">
            Lead<span className="text-gradient">Gen</span>
          </span>
        </Link>

        {/* Nav — pill tabs */}
        <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.06] p-1 rounded-xl">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
                {label}
              </Link>
            )
          })}
        </div>

        {/* Right */}
        <ThemeToggle />
      </div>
    </nav>
  )
}
