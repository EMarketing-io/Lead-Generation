'use client'

import { useState } from 'react'
import {
  Zap, Download, Sparkles, Search, MapPin, Database,
  CheckCircle2, Lightbulb, ArrowRight,
} from 'lucide-react'
import GeneratorForm from '../../components/GeneratorForm'
import LeadsTable from '../../components/LeadsTable'
import type { Lead } from '../../lib/api'

function downloadCSV(leads: Lead[]) {
  const esc = (v: string) => `"${String(v || '').replace(/"/g, '""')}"`
  const headers = ['Timestamp', 'Keyword', 'Business Name', 'Phone', 'Website', 'Email', 'Address']
  const rows = leads.map(l => [
    esc(l.timestamp), esc(l.keyword), esc(l.businessName),
    esc(l.phone), esc(l.website), esc(l.email), esc(l.address),
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

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: Search,
    title: 'Enter keywords',
    desc: 'Type business categories you want to target — one per line or comma-separated.',
    color: 'indigo',
  },
  {
    step: '02',
    icon: MapPin,
    title: 'Set a location',
    desc: 'Add a city or region to get local results. Leave blank for broader searches.',
    color: 'violet',
  },
  {
    step: '03',
    icon: Database,
    title: 'Auto-saved to sheet',
    desc: 'Leads are fetched from Google Maps and saved instantly — duplicates are skipped.',
    color: 'emerald',
  },
]

const TIPS = [
  'Use simple category names like "hotel" or "hospital" — not full sentences',
  'Add a specific city in Location for higher-quality, local leads',
  'Run the same keywords across different cities to scale up',
  'Leads with a website are the easiest to find contact info for',
  'Use the Keyword column in Leads to filter by campaign batch',
]

export default function GeneratePage() {
  const [recentLeads, setRecentLeads] = useState<Lead[]>([])

  return (
    /* h-[calc(100vh-8rem)]: fill viewport minus navbar (4rem) and main py-8 (4rem total) */
    <div className="flex flex-col gap-6 h-[calc(100vh-8rem)]">
      {/* Page header */}
      <div className="flex-shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">Generator</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Generate Leads</h1>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
          Search Google Maps by keyword — results save automatically to your sheet
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8 flex-1 min-h-0">
        {/* Form card — fixed, no scroll */}
        <div className="overflow-y-auto">
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#161b27] shadow-sm overflow-hidden">
            {/* Card header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-white/[0.04]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm shadow-indigo-500/25">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Lead Generator</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Powered by Google Maps</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <GeneratorForm onLeadsGenerated={setRecentLeads} />
            </div>
          </div>
        </div>

        {/* Right panel — independently scrollable */}
        <div className="overflow-y-auto pr-1">
          {recentLeads.length > 0 ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Latest Results</h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Saved to Google Sheets · download below</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20">
                    {recentLeads.length} leads
                  </span>
                  <button
                    onClick={() => downloadCSV(recentLeads)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white transition-colors shadow-sm shadow-indigo-500/25"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download CSV
                  </button>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#161b27] shadow-sm p-4">
                <LeadsTable leads={recentLeads} />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* How it works */}
              <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#161b27] shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 dark:border-white/[0.04]">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">How it works</h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Three steps to your first batch of leads</p>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc, color }) => (
                    <div key={step} className="flex items-start gap-5 px-6 py-5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        color === 'indigo' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500'
                        : color === 'violet' ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-500'
                        : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold tracking-widest text-slate-300 dark:text-slate-600">{step}</span>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</p>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-200 dark:text-slate-700 flex-shrink-0 mt-3" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Pro tips */}
              <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#161b27] shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 dark:border-white/[0.04]">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Pro tips</h2>
                  </div>
                </div>
                <ul className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {TIPS.map((tip, i) => (
                    <li key={i} className="flex items-start gap-3 px-6 py-4">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{tip}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
