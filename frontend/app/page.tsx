'use client'

import { useEffect, useState, useCallback } from 'react'
import { Users, TrendingUp, Calendar, Phone, Globe, RefreshCw, CalendarDays, Sparkles } from 'lucide-react'
import StatsCard from '../components/StatsCard'
import AnalyticsChart from '../components/AnalyticsChart'
import { fetchAnalytics, type Analytics } from '../lib/api'

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try { setAnalytics(await fetchAnalytics()) }
    catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">Overview</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics Dashboard</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">{today}</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 disabled:opacity-50 transition-all shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm">
          {error} — make sure the backend is running.
        </div>
      )}

      {/* Stats grid */}
      {loading && !analytics ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[120px] rounded-2xl bg-slate-100 dark:bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatsCard title="Total Leads"   value={analytics?.total ?? 0}      subtitle="All time"              icon={Users}       color="indigo"  />
          <StatsCard title="Today"         value={analytics?.today ?? 0}      subtitle="Generated today"       icon={TrendingUp}  color="emerald" />
          <StatsCard title="This Week"     value={analytics?.thisWeek ?? 0}   subtitle="Last 7 days"           icon={Calendar}    color="amber"   />
          <StatsCard title="This Month"    value={analytics?.thisMonth ?? 0}  subtitle="Last 30 days"          icon={CalendarDays} color="rose"   />
          <StatsCard
            title="With Phone"
            value={analytics?.withPhone ?? 0}
            subtitle={analytics && analytics.total > 0 ? `${Math.round((analytics.withPhone / analytics.total) * 100)}% contactable` : '—'}
            icon={Phone} color="violet"
          />
          <StatsCard
            title="With Website"
            value={analytics?.withWebsite ?? 0}
            subtitle={analytics && analytics.total > 0 ? `${Math.round((analytics.withWebsite / analytics.total) * 100)}% have web` : '—'}
            icon={Globe} color="indigo"
          />
        </div>
      )}

      {/* Chart card */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#161b27] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-white/[0.04]">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Leads Over Time</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Daily breakdown · last 30 days</p>
          </div>
          {analytics && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
              {analytics.thisMonth} this month
            </span>
          )}
        </div>
        <div className="p-6">
          <AnalyticsChart data={analytics?.chartData ?? []} />
        </div>
      </div>
    </div>
  )
}
