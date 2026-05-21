'use client'

import { useState, useMemo } from 'react'
import {
  Search, Phone, Globe, MapPin, Mail, ChevronLeft, ChevronRight,
  CheckSquare, Square, CheckCircle2, XCircle, Trash2, X, MinusSquare,
  Tag, Filter, Download,
} from 'lucide-react'
import type { Lead } from '../lib/api'
import LeadDetailModal from './LeadDetailModal'

interface LeadsTableProps {
  leads: Lead[]
  onStatusChange?: (rowIndices: number[], status: string) => Promise<void>
  onDelete?: (rowIndices: number[]) => Promise<void>
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'real') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
      <CheckCircle2 className="w-3 h-3" /> Real
    </span>
  )
  if (status === 'fake') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 whitespace-nowrap">
      <XCircle className="w-3 h-3" /> Fake
    </span>
  )
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 whitespace-nowrap">
      Unverified
    </span>
  )
}

const STATUS_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Unverified', value: '' },
  { label: 'Real', value: 'real' },
  { label: 'Fake', value: 'fake' },
]

export default function LeadsTable({ leads, onStatusChange, onDelete }: LeadsTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [keywordFilter, setKeywordFilter] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [processing, setProcessing] = useState(false)
  const [modalRowIndex, setModalRowIndex] = useState<number | null>(null)
  const PAGE_SIZE = 25

  // Always look up from the live leads array so status updates propagate instantly
  const modalLead = modalRowIndex !== null ? leads.find(l => l.rowIndex === modalRowIndex) ?? null : null

  const keywords = useMemo(() =>
    [...new Set(leads.map(l => l.keyword).filter(Boolean))].sort(),
    [leads]
  )

  const filtered = useMemo(() => leads.filter(l => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false
    if (keywordFilter && l.keyword !== keywordFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return [l.businessName, l.phone, l.website, l.address, l.email, l.keyword]
        .some(v => v.toLowerCase().includes(q))
    }
    return true
  }), [leads, statusFilter, keywordFilter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const visibleIndices = rows.map(r => r.rowIndex)
  const allVisibleSelected = visibleIndices.length > 0 && visibleIndices.every(i => selected.has(i))
  const someVisibleSelected = visibleIndices.some(i => selected.has(i))

  function resetPage() { setPage(1) }

  function toggleRow(idx: number) {
    setSelected(prev => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n })
  }
  function toggleAll() {
    setSelected(prev => {
      const n = new Set(prev)
      allVisibleSelected ? visibleIndices.forEach(i => n.delete(i)) : visibleIndices.forEach(i => n.add(i))
      return n
    })
  }

  async function handleStatus(status: string) {
    if (!onStatusChange || selected.size === 0) return
    setProcessing(true)
    try { await onStatusChange([...selected], status); setSelected(new Set()) }
    finally { setProcessing(false) }
  }
  async function handleDelete() {
    if (!onDelete || selected.size === 0) return
    setProcessing(true)
    try { await onDelete([...selected]); setSelected(new Set()) }
    finally { setProcessing(false) }
  }

  const interactive = !!(onStatusChange || onDelete)

  const activeFilters = [statusFilter !== 'all', !!keywordFilter].filter(Boolean).length

  function downloadFilteredCSV() {
    const esc = (v: string) => `"${String(v || '').replace(/"/g, '""')}"`
    const headers = ['Timestamp', 'Keyword', 'Business Name', 'Phone', 'Website', 'Email', 'Address', 'Status']
    const rows = filtered.map(l => [
      esc(l.timestamp), esc(l.keyword), esc(l.businessName),
      esc(l.phone), esc(l.website), esc(l.email), esc(l.address), esc(l.status),
    ].join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3">
      {/* Search row */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search name, phone, website, keyword…"
          value={search}
          onChange={e => { setSearch(e.target.value); resetPage() }}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-colors"
        />
      </div>

      {/* Filter bar — count left · switcher center · keyword+export right */}
      <div className="flex items-center justify-between gap-4">

        {/* Left: result count */}
        <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap tabular w-28">
          {filtered.length.toLocaleString()} of {leads.length.toLocaleString()} leads
        </span>

        {/* Center: status switcher */}
        <div className="flex items-center gap-0.5 p-1 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.06]">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => { setStatusFilter(f.value); resetPage() }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === f.value
                  ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {f.label}
              {f.value === 'all' && <span className="ml-1.5 text-slate-400 dark:text-slate-500">{leads.length}</span>}
              {f.value === 'real' && <span className="ml-1.5 text-emerald-500">{leads.filter(l => l.status === 'real').length}</span>}
              {f.value === 'fake' && <span className="ml-1.5 text-rose-500">{leads.filter(l => l.status === 'fake').length}</span>}
              {f.value === '' && <span className="ml-1.5 text-slate-400">{leads.filter(l => !l.status).length}</span>}
            </button>
          ))}
        </div>

        {/* Right: keyword filter + clear + export */}
        <div className="flex items-center gap-2 w-28 justify-end">
          {keywords.length > 0 && (
            <div className="relative">
              <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
              <select
                value={keywordFilter}
                onChange={e => { setKeywordFilter(e.target.value); resetPage() }}
                className={`pl-7 pr-6 py-1.5 rounded-lg border text-xs font-medium appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors max-w-[130px] ${
                  keywordFilter
                    ? 'border-indigo-300 dark:border-indigo-500/40 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-slate-600 dark:text-slate-300'
                }`}
              >
                <option value="">Keywords</option>
                {keywords.map(kw => <option key={kw} value={kw}>{kw}</option>)}
              </select>
            </div>
          )}

          {activeFilters > 0 && (
            <button
              onClick={() => { setStatusFilter('all'); setKeywordFilter(''); setSearch(''); resetPage() }}
              title="Clear all filters"
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors border border-slate-200 dark:border-white/[0.08]"
            >
              <X className="w-3 h-3" />
              <span className="w-3.5 h-3.5 rounded-full bg-indigo-500 text-white text-[9px] flex items-center justify-center">{activeFilters}</span>
            </button>
          )}

          <button
            onClick={downloadFilteredCSV}
            disabled={filtered.length === 0}
            title={`Export ${filtered.length} lead${filtered.length !== 1 ? 's' : ''} as CSV`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-indigo-500/20 whitespace-nowrap"
          >
            <Download className="w-3 h-3" />
            Export {activeFilters > 0 || search ? `(${filtered.length})` : 'CSV'}
          </button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && interactive && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 flex-wrap">
          <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
            {selected.size} selected
          </span>
          <div className="flex items-center gap-1.5 ml-auto flex-wrap">
            <button onClick={() => handleStatus('real')} disabled={processing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-800/60 disabled:opacity-50 transition-colors">
              <CheckCircle2 className="w-3.5 h-3.5" /> Mark Real
            </button>
            <button onClick={() => handleStatus('fake')} disabled={processing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-800/60 disabled:opacity-50 transition-colors">
              <XCircle className="w-3.5 h-3.5" /> Mark Fake
            </button>
            <button onClick={() => handleStatus('')} disabled={processing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors">
              Clear Status
            </button>
            <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1" />
            <button onClick={handleDelete} disabled={processing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
            <button onClick={() => setSelected(new Set())}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/[0.06]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/[0.04]">
              {interactive && (
                <th className="px-4 py-3 w-10">
                  <button onClick={toggleAll} className="flex items-center text-slate-400 hover:text-indigo-500 transition-colors">
                    {allVisibleSelected ? <CheckSquare className="w-4 h-4 text-indigo-500" />
                      : someVisibleSelected ? <MinusSquare className="w-4 h-4 text-indigo-400" />
                      : <Square className="w-4 h-4" />}
                  </button>
                </th>
              )}
              {['Business Name', 'Keyword', 'Phone', 'Website', 'Email', 'Address', 'Status', 'Date'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={interactive ? 9 : 8} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-slate-500">
                    <Filter className="w-8 h-8 opacity-40" />
                    <p className="font-medium">{search || activeFilters > 0 ? 'No leads match your filters' : 'No leads yet'}</p>
                    {(activeFilters > 0 || search) && (
                      <button onClick={() => { setStatusFilter('all'); setKeywordFilter(''); setSearch('') }}
                        className="text-xs text-indigo-500 hover:underline">Clear filters</button>
                    )}
                  </div>
                </td>
              </tr>
            ) : rows.map(lead => {
              const isSelected = selected.has(lead.rowIndex)
              return (
                <tr key={lead.rowIndex}
                  onClick={() => setModalRowIndex(lead.rowIndex)}
                  className={`transition-colors cursor-pointer ${
                    isSelected ? 'bg-indigo-50/60 dark:bg-indigo-900/10'
                      : 'bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-white/[0.02]'
                  }`}>
                  {interactive && (
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <button onClick={() => toggleRow(lead.rowIndex)}
                        className="flex items-center text-slate-300 hover:text-indigo-500 dark:text-slate-600 dark:hover:text-indigo-400 transition-colors">
                        {isSelected ? <CheckSquare className="w-4 h-4 text-indigo-500" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                  )}
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white max-w-[180px]">
                    <span className="truncate block">{lead.businessName || '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    {lead.keyword
                      ? <button onClick={() => { setKeywordFilter(lead.keyword); resetPage() }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-800/50 transition-colors whitespace-nowrap">
                          <Tag className="w-3 h-3" />{lead.keyword}
                        </button>
                      : <span className="text-slate-400 dark:text-slate-500">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {lead.phone
                      ? <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400">
                          <Phone className="w-3 h-3 flex-shrink-0" />{lead.phone}
                        </a> : '—'}
                  </td>
                  <td className="px-4 py-3 max-w-[180px]">
                    {lead.website
                      ? <a href={lead.website} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:underline">
                          <Globe className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                        </a> : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {lead.email
                      ? <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400">
                          <Mail className="w-3 h-3 flex-shrink-0" />{lead.email}
                        </a>
                      : <span className="text-slate-400 dark:text-slate-500">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-[220px]">
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{lead.address || '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={lead.status} /></td>
                  <td className="px-4 py-3 text-slate-400 dark:text-slate-500 whitespace-nowrap text-xs">
                    {lead.timestamp
                      ? new Date(lead.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400 px-1">
          <span>{filtered.length.toLocaleString()} result{filtered.length !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-600 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1.5 font-medium">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-600 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Lead detail modal */}
      {modalLead && (
        <LeadDetailModal
          lead={modalLead}
          onClose={() => setModalRowIndex(null)}
          onStatusChange={onStatusChange}
        />
      )}
    </div>
  )
}
