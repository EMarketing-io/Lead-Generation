import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: number | string
  subtitle?: string
  icon: LucideIcon
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'violet'
}

const colorMap = {
  indigo: {
    card: 'border-slate-200 dark:border-white/[0.06]',
    iconBg: 'bg-indigo-100 dark:bg-indigo-500/10',
    iconText: 'text-indigo-600 dark:text-indigo-400',
    accent: 'bg-indigo-500',
    glow: 'shadow-indigo-500/10',
  },
  emerald: {
    card: 'border-slate-200 dark:border-white/[0.06]',
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/10',
    iconText: 'text-emerald-600 dark:text-emerald-400',
    accent: 'bg-emerald-500',
    glow: 'shadow-emerald-500/10',
  },
  amber: {
    card: 'border-slate-200 dark:border-white/[0.06]',
    iconBg: 'bg-amber-100 dark:bg-amber-500/10',
    iconText: 'text-amber-600 dark:text-amber-400',
    accent: 'bg-amber-500',
    glow: 'shadow-amber-500/10',
  },
  rose: {
    card: 'border-slate-200 dark:border-white/[0.06]',
    iconBg: 'bg-rose-100 dark:bg-rose-500/10',
    iconText: 'text-rose-600 dark:text-rose-400',
    accent: 'bg-rose-500',
    glow: 'shadow-rose-500/10',
  },
  violet: {
    card: 'border-slate-200 dark:border-white/[0.06]',
    iconBg: 'bg-violet-100 dark:bg-violet-500/10',
    iconText: 'text-violet-600 dark:text-violet-400',
    accent: 'bg-violet-500',
    glow: 'shadow-violet-500/10',
  },
}

export default function StatsCard({ title, value, subtitle, icon: Icon, color = 'indigo' }: StatsCardProps) {
  const c = colorMap[color]
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-white dark:bg-[#161b27] ${c.card} shadow-sm hover:shadow-md ${c.glow} transition-all duration-200 p-6`}>
      {/* Top color accent */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] ${c.accent} opacity-70`} />

      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{title}</p>
          <p className="text-4xl font-bold text-slate-900 dark:text-white mt-2 tabular leading-none">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${c.iconBg} flex-shrink-0 ml-3`}>
          <Icon className={`w-5 h-5 ${c.iconText}`} />
        </div>
      </div>
    </div>
  )
}
