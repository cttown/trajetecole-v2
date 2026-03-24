import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { requireAdmin } from '../../../lib/requireAdmin'

type DailyPoint = {
  day: string
  value: number
}

type PageCount = {
  page: string
  views: number
}

type StatsDetailsResponse =
  | {
      totals: {
        totalPageViews: number
        totalTripCreatedEvents: number
        totalMatchRequestEvents: number
        totalContactAdminEvents: number
        totalSignupEvents: number
      }
      pageViewsLast30Days: DailyPoint[]
      tripsCreatedLast30Days: DailyPoint[]
      topPages: PageCount[]
    }
  | { error: string }

function getLast30DaysStartIso() {
  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() - 29)
  start.setHours(0, 0, 0, 0)
  return start.toISOString()
}

function buildDailySeries(
  rows: Array<{ created_at: string }>,
  days = 30
): DailyPoint[] {
  const counts = new Map<string, number>()
  const today = new Date()
  const orderedDays: string[] = []

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    orderedDays.push(key)
    counts.set(key, 0)
  }

  for (const row of rows) {
    const key = row.created_at.slice(0, 10)
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }

  return orderedDays.map((day) => ({
    day,
    value: counts.get(day) ?? 0,
  }))
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StatsDetailsResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const adminCheck = await requireAdmin(req)

  if (!adminCheck.ok) {
    return res.status(adminCheck.status).json({ error: adminCheck.error })
  }

  try {
    const startDate = getLast30DaysStartIso()

    const [
      totalPageViewsQuery,
      totalTripCreatedQuery,
      totalMatchRequestQuery,
      totalContactAdminQuery,
      totalSignupQuery,
      pageViewsRowsQuery,
      tripsCreatedRowsQuery,
      topPagesQuery,
    ] = await Promise.all([
      supabaseAdmin
        .from('site_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'page_view'),

      supabaseAdmin
        .from('site_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'trip_created'),

      supabaseAdmin
        .from('site_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'match_request_sent'),

      supabaseAdmin
        .from('site_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'contact_admin_sent'),

      supabaseAdmin
        .from('site_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'signup'),

      supabaseAdmin
        .from('site_events')
        .select('created_at')
        .eq('event_type', 'page_view')
        .gte('created_at', startDate)
        .order('created_at', { ascending: true }),

      supabaseAdmin
        .from('site_events')
        .select('created_at')
        .eq('event_type', 'trip_created')
        .gte('created_at', startDate)
        .order('created_at', { ascending: true }),

      supabaseAdmin
        .from('site_events')
        .select('page')
        .eq('event_type', 'page_view')
        .not('page', 'is', null),
    ])

    if (totalPageViewsQuery.error) throw totalPageViewsQuery.error
    if (totalTripCreatedQuery.error) throw totalTripCreatedQuery.error
    if (totalMatchRequestQuery.error) throw totalMatchRequestQuery.error
    if (totalContactAdminQuery.error) throw totalContactAdminQuery.error
    if (totalSignupQuery.error) throw totalSignupQuery.error
    if (pageViewsRowsQuery.error) throw pageViewsRowsQuery.error
    if (tripsCreatedRowsQuery.error) throw tripsCreatedRowsQuery.error
    if (topPagesQuery.error) throw topPagesQuery.error

    const pageCountsMap = new Map<string, number>()

    for (const row of topPagesQuery.data ?? []) {
      const page = row.page || 'unknown'
      pageCountsMap.set(page, (pageCountsMap.get(page) ?? 0) + 1)
    }

    const topPages = Array.from(pageCountsMap.entries())
      .map(([page, views]) => ({ page, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10)

    return res.status(200).json({
      totals: {
        totalPageViews: totalPageViewsQuery.count ?? 0,
        totalTripCreatedEvents: totalTripCreatedQuery.count ?? 0,
        totalMatchRequestEvents: totalMatchRequestQuery.count ?? 0,
        totalContactAdminEvents: totalContactAdminQuery.count ?? 0,
        totalSignupEvents: totalSignupQuery.count ?? 0,
      },
      pageViewsLast30Days: buildDailySeries(pageViewsRowsQuery.data ?? [], 30),
      tripsCreatedLast30Days: buildDailySeries(tripsCreatedRowsQuery.data ?? [], 30),
      topPages,
    })
  } catch (error) {
    console.error('Admin stats details error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}