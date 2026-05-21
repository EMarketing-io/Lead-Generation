'use client'

import { useEffect, useState } from 'react'
import {
  X, Phone, Globe, Mail, MapPin, Tag, Calendar,
  CheckCircle2, XCircle, Loader2, ExternalLink, Building2,
} from 'lucide-react'
import type { Lead } from '../lib/api'

interface LeadDetailModalProps {
  lead: Lead
  onClose: () => void
  onStatusChange?: (rowIndices: number[], status: string) => Promise<void>
}

function StatusPill({ status }: { status: string }) {
  if (status === 'real') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/25">
      <CheckCircle2 className="w-3 h-3" /> Real
    </span>
  )
  if (status === 'fake') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/25">
      <XCircle className="w-3 h-3" /> Fake
    </span>
  )
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/[0.08]">
      Unverified
    </span>
  )
}

function DetailRow({ icon, label, children, empty }: {
  icon: React.ReactNode; label: string; children?: React.ReactNode; empty?: boolean
}) {
  return (
    <div className="flex items-start gap-4 py-3.5 border-b border-slate-100 dark:border-white/[0.04] last:border-0">
      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/[0.05] flex items-center justify-center flex-shrink-0">
        <span className="text-slate-400 dark:text-slate-500">{icon}</span>
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{label}</p>
        {empty
          ? <p className="text-sm text-slate-300 dark:text-slate-600">—</p>
          : <div className="text-sm text-slate-800 dark:text-slate-200 break-words">{children}</div>}
      </div>
    </div>
  )
}

export default function LeadDetailModal({ lead, onClose, onStatusChange }: LeadDetailModalProps) {
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])

  async function handleStatus(status: string) {
    if (!onStatusChange) return
    setProcessing(true)
    try { await onStatusChange([lead.rowIndex], status) }
    finally { setProcessing(false) }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#161b27] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/[0.08] overflow-hidden animate-[modalIn_0.18s_ease-out]">
        {/* Top accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-6 pb-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-snug break-words">
                {lead.businessName || 'Unnamed Business'}
              </h2>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {lead.keyword && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-500/20">
                    <Tag className="w-2.5 h-2.5" />{lead.keyword}
                  </span>
                )}
                <StatusPill status={lead.status} />
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px bg-slate-100 dark:bg-white/[0.04]" />

        {/* Details */}
        <div className="px-5 py-1">
          <DetailRow icon={<Phone className="w-3.5 h-3.5" />} label="Phone" empty={!lead.phone}>
            <a href={`tel:${lead.phone}`} className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
              {lead.phone}
            </a>
          </DetailRow>
          <DetailRow icon={<Globe className="w-3.5 h-3.5" />} label="Website" empty={!lead.website}>
            <a href={lead.website} target="_blank" rel="noopener noreferrer"
              className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 break-all">
              {lead.website?.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
          </DetailRow>
          <DetailRow icon={<Mail className="w-3.5 h-3.5" />} label="Email" empty={!lead.email}>
            <a href={`mailto:${lead.email}`} className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
              {lead.email}
            </a>
          </DetailRow>
          <DetailRow icon={<MapPin className="w-3.5 h-3.5" />} label="Address" empty={!lead.address}>
            <span className="leading-relaxed text-slate-700 dark:text-slate-300">{lead.address}</span>
          </DetailRow>
          <DetailRow icon={<Calendar className="w-3.5 h-3.5" />} label="Added" empty={!lead.timestamp}>
            <span className="text-slate-500 dark:text-slate-400">
              {lead.timestamp && new Date(lead.timestamp).toLocaleString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </DetailRow>
        </div>

        {/* Status actions */}
        {onStatusChange && (
          <div className="px-5 py-4 mt-1 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/[0.04]">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Mark as</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleStatus('real')}
                disabled={processing || lead.status === 'real'}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:cursor-not-allowed ${
                  lead.status === 'real'
                    ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                    : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/25 disabled:opacity-50'
                }`}
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Real
              </button>
              <button
                onClick={() => handleStatus('fake')}
                disabled={processing || lead.status === 'fake'}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:cursor-not-allowed ${
                  lead.status === 'fake'
                    ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/30'
                    : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/25 disabled:opacity-50'
                }`}
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Fake
              </button>
              {lead.status !== '' && (
                <button
                  onClick={() => handleStatus('')}
                  disabled={processing}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/[0.08] transition-all disabled:opacity-50"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
