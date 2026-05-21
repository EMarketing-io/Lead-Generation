'use client'

import { useState, useEffect, useRef } from 'react'
import { Zap, AlertCircle, CheckCircle2, Loader2, Hash, Mail, Clock } from 'lucide-react'
import type { Lead } from '../lib/api'

interface GeneratorFormProps {
  onLeadsGenerated?: (leads: Lead[]) => void
}

// ~0.3s per page (20 results) + 2.5s per lead for email scraping
function calcEtaSeconds(keywordCount: number, maxPerKeyword: number, scrapeEmails: boolean) {
  const pages = Math.ceil(maxPerKeyword / 20)
  const mapsTime = keywordCount * pages * 0.8
  const emailTime = scrapeEmails ? keywordCount * maxPerKeyword * 2.5 : 0
  return Math.ceil(mapsTime + emailTime)
}

function fmtTime(s: number) {
  if (s <= 0) return '0s'
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`
}

export default function GeneratorForm({ onLeadsGenerated }: GeneratorFormProps) {
  const [keywords, setKeywords] = useState('')
  const [maxPerKeyword, setMaxPerKeyword] = useState(20)
  const [scrapeEmails, setScrapeEmails] = useState(false)
  const [loading, setLoading] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [result, setResult] = useState<{ count: number; skipped: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const keywordCount = keywords.split(/[\n,]/).map(k => k.trim()).filter(Boolean).length
  const eta = calcEtaSeconds(keywordCount, maxPerKeyword, scrapeEmails)
  const progress = loading ? Math.min((elapsed / eta) * 100, 95) : 0
  const remaining = Math.max(eta - elapsed, 0)

  useEffect(() => {
    if (loading) {
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [loading])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    const keywordList = keywords
      .split(/[\n,]/)
      .map(k => k.trim())
      .filter(Boolean)

    if (keywordList.length === 0) {
      setError('Please enter at least one keyword')
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/leads/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: keywordList, maxPerKeyword, scrapeEmails }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate leads')
      setResult({ count: data.count, skipped: data.skipped ?? 0 })
      onLeadsGenerated?.(data.leads)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Keywords */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Keywords
          </label>
          {keywordCount > 0 ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
              <Hash className="w-3 h-3" />
              {keywordCount} keyword{keywordCount > 1 ? 's' : ''} · up to {keywordCount * maxPerKeyword} leads
            </span>
          ) : (
            <span className="text-xs text-slate-400 dark:text-slate-500">one per line or comma-separated</span>
          )}
        </div>
        <textarea
          value={keywords}
          onChange={e => setKeywords(e.target.value)}
          placeholder={"hotel\nhospital\nhome furnishing store\nresort"}
          rows={10}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.03] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-mono resize-none transition-colors leading-relaxed"
        />
      </div>

      {/* Max results — segmented control */}
      <div>
        <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">
          Results per keyword
        </label>
        <div className="grid grid-cols-4 gap-2">
          {[20, 40, 60, 100].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setMaxPerKeyword(n)}
              className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                maxPerKeyword === n
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-500/25'
                  : 'border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-500/40 bg-white dark:bg-white/[0.03]'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">Fetches multiple pages · duplicates are auto-skipped</p>
      </div>

      {/* Email scraping toggle */}
      <div
        onClick={() => setScrapeEmails(v => !v)}
        className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all select-none ${
          scrapeEmails
            ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30'
            : 'bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.12]'
        }`}
      >
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
          scrapeEmails
            ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
            : 'bg-slate-100 dark:bg-white/[0.06] text-slate-400 dark:text-slate-500'
        }`}>
          <Mail className="w-[18px] h-[18px]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-sm font-semibold ${scrapeEmails ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}>
              Scrape emails from websites
            </p>
            <div className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${scrapeEmails ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-white/[0.12]'}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${scrapeEmails ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            Visits each business website to find email addresses.
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Success */}
      {result && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {result.count} new lead{result.count !== 1 ? 's' : ''} saved to Google Sheets
          </div>
          {result.skipped > 0 && (
            <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1 ml-6">
              {result.skipped} duplicate{result.skipped !== 1 ? 's' : ''} skipped
            </p>
          )}
          {result.count === 0 && (
            <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1 ml-6">
              Try different or more specific keywords
            </p>
          )}
        </div>
      )}

      {/* Progress block — shown while loading */}
      {loading && (
        <div className="space-y-2.5">
          {/* Progress bar */}
          <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-white/[0.08] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-1000 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          {/* Timing row */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
              <span>{scrapeEmails ? 'Searching + scraping emails…' : 'Searching Google Maps…'}</span>
            </div>
            <div className="flex items-center gap-1 tabular font-medium">
              <Clock className="w-3 h-3" />
              <span>{fmtTime(elapsed)} elapsed</span>
              {remaining > 0 && (
                <span className="text-slate-400 dark:text-slate-500 ml-1">· ~{fmtTime(remaining)} left</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Generate button */}
      <div className="space-y-2">
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:from-indigo-700 active:to-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-md shadow-indigo-500/20 text-sm"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Generate Leads
            </>
          )}
        </button>

        {/* Pre-flight ETA estimate */}
        {!loading && keywordCount > 0 && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <Clock className="w-3 h-3" />
            <span>Estimated time: <span className="font-semibold text-slate-500 dark:text-slate-400">~{fmtTime(eta)}</span></span>
            {scrapeEmails && <span className="text-amber-500 dark:text-amber-400">· includes email scraping</span>}
          </div>
        )}
      </div>

    </form>
  )
}
