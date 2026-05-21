'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, ExternalLink, Sparkles } from 'lucide-react'
import LeadsTable from '../../components/LeadsTable'
import { fetchLeads, updateLeadStatuses, deleteLeads, type Lead } from '../../lib/api'

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1UVcBZgaDsrcZuTEEVS5rX9KSP7FY4wNte7_CwS7FHWQ/edit'

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try { setLeads(await fetchLeads()) }
    catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleStatusChange(rowIndices: number[], status: string) {
    await updateLeadStatuses(rowIndices, status)
    setLeads(prev => prev.map(l => rowIndices.includes(l.rowIndex) ? { ...l, status } : l))
  }

  async function handleDelete(rowIndices: number[]) {
    await deleteLeads(rowIndices)
    setLeads(prev => prev.filter(l => !rowIndices.includes(l.rowIndex)))
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">Database</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Leads</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
            {loading ? 'Loading…' : `${leads.length.toLocaleString()} leads · click any row to view details`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={SHEET_URL} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Open Sheet
          </a>
          <button
            onClick={load} disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 disabled:opacity-50 transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#161b27] shadow-sm">
        {loading && leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
            <p className="text-sm text-slate-400 dark:text-slate-500">Fetching from Google Sheets…</p>
          </div>
        ) : (
          <div className="p-4 sm:p-6">
            <LeadsTable leads={leads} onStatusChange={handleStatusChange} onDelete={handleDelete} />
          </div>
        )}
      </div>
    </div>
  )
}
