import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { requireAdmin } from '../../../lib/requireAdmin'

type StatsResponse =
  | {
      totalUsers: number
      totalChildren: number
      totalTrips: number
      searchingTrips: number
      resolvedTrips: number
      pausedTrips: number
      archivedTrips: number
      pendingPlaceSuggestions: number
      unreadContactMessages: number
      recentMessages: Array<{
        id: string
        parent_first_name?: string | null
        parent_last_name?: string | null
        email: string
        subject: string
        status: string
        created_at: string
      }>
    }
  | { error: string }

async function countRows(table: string) {
  const { count, error } = await supabaseAdmin
    .from(table)
    .select('*', { count: 'exact', head: true })

  if (error) throw error
  return count ?? 0
}

async function countTripsByStatus(status: 'searching' | 'resolved' | 'paused' | 'archived') {
  const { count, error } = await supabaseAdmin
    .from('trips')
    .select('*', { count: 'exact', head: true })
    .eq('status', status)

  if (error) throw error
  return count ?? 0
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StatsResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const adminCheck = await requireAdmin(req)

  if (!adminCheck.ok) {
    return res.status(adminCheck.status).json({ error: adminCheck.error })
  }

  try {
    const [
      totalUsers,
      totalChildren,
      totalTrips,
      searchingTrips,
      resolvedTrips,
      pausedTrips,
      archivedTrips,
    ] = await Promise.all([
      countRows('profiles'),
      countRows('children'),
      countRows('trips'),
      countTripsByStatus('searching'),
      countTripsByStatus('resolved'),
      countTripsByStatus('paused'),
      countTripsByStatus('archived'),
    ])

    const pendingPlacesQuery = await supabaseAdmin
      .from('place_suggestions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    if (pendingPlacesQuery.error) throw pendingPlacesQuery.error

    const pendingMessagesQuery = await supabaseAdmin
      .from('admin_contact_messages')
      .select('*', { count: 'exact', head: true })
      .in('status', ['new', 'in_progress'])

    if (pendingMessagesQuery.error) throw pendingMessagesQuery.error

    const recentMessagesQuery = await supabaseAdmin
      .from('admin_contact_messages')
      .select(
        'id, parent_first_name, parent_last_name, email, subject, status, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(5)

    if (recentMessagesQuery.error) throw recentMessagesQuery.error

    return res.status(200).json({
      totalUsers,
      totalChildren,
      totalTrips,
      searchingTrips,
      resolvedTrips,
      pausedTrips,
      archivedTrips,
      pendingPlaceSuggestions: pendingPlacesQuery.count ?? 0,
      unreadContactMessages: pendingMessagesQuery.count ?? 0,
      recentMessages: recentMessagesQuery.data ?? [],
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}