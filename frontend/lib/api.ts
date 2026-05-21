const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'

export interface Lead {
  rowIndex: number
  timestamp: string
  keyword: string
  businessName: string
  phone: string
  website: string
  email: string
  address: string
  status: string // 'real' | 'fake' | ''
}

export interface Analytics {
  total: number
  today: number
  thisWeek: number
  thisMonth: number
  withPhone: number
  withWebsite: number
  chartData: { date: string; count: number }[]
}

export async function fetchLeads(): Promise<Lead[]> {
  const res = await fetch(`${API_URL}/api/leads`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch leads')
  return (await res.json()).leads
}

export async function fetchAnalytics(): Promise<Analytics> {
  const res = await fetch(`${API_URL}/api/analytics`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch analytics')
  return res.json()
}

export async function updateLeadStatuses(rowIndices: number[], status: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/leads/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rowIndices, status }),
  })
  if (!res.ok) throw new Error('Failed to update statuses')
}

export async function deleteLeads(rowIndices: number[]): Promise<void> {
  const res = await fetch(`${API_URL}/api/leads`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rowIndices }),
  })
  if (!res.ok) throw new Error('Failed to delete leads')
}

export function getExportUrl(): string {
  return `${API_URL}/api/leads/export`
}
