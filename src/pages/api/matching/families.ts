import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

type TripRow = {
  id: string
  family_id: string
  child_id: string
  from_place_id: string | null
  to_place_id: string | null
  from_place_suggestion_id: string | null
  to_place_suggestion_id: string | null
  day_of_week: number
  from_time: string
  to_time: string | null
  tolerance_min: number
  status: 'searching' | 'resolved_open' | 'resolved' | 'archived'
  revision: number
  created_at: string
  trip_group_id: string
}

type FamilyRow = {
  id: string
  parent_first_name: string | null
  parent_last_name: string | null
  email: string
}

type ChildRow = {
  id: string
  first_name: string
}

type PlaceRow = {
  id: string
  name: string
  city: string
}

type ContactRequestHistoryRow = {
  id: string
  requester_family_id: string
  target_family_id: string
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled'
  created_at: string
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }
  return value
}

function timeToMinutes(value: string | null): number | null {
  if (!value) return null

  const [hours, minutes] = value.split(':').map(Number)

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null

  return hours * 60 + minutes
}

function formatTimeValue(value: string | null) {
  if (!value) return '—'
  return value.slice(0, 5)
}

function placeLabel(placeId: string | null, placeMap: Record<string, PlaceRow>) {
  if (!placeId) return 'Lieu non renseigné'
  const place = placeMap[placeId]
  if (!place) return 'Lieu inconnu'
  return `${place.name} (${place.city})`
}

function isRequesterTripEligible(trip: TripRow): boolean {
  return (
    trip.status === 'searching' &&
    !!trip.from_place_id &&
    !!trip.to_place_id &&
    !trip.from_place_suggestion_id &&
    !trip.to_place_suggestion_id
  )
}

function isTargetTripEligible(trip: TripRow): boolean {
  return (
    (trip.status === 'searching' || trip.status === 'resolved_open') &&
    !!trip.from_place_id &&
    !!trip.to_place_id &&
    !trip.from_place_suggestion_id &&
    !trip.to_place_suggestion_id
  )
}

function computeHistoryInfo(history: ContactRequestHistoryRow | null) {
  if (!history) {
    return {
      history_status: 'none_yet' as const,
      history_label: 'Aucun échange récent',
      history_score_normalized: 1,
      badge_tone: 'green' as const,
    }
  }

  if (history.status === 'pending') {
    return {
      history_status: 'pending' as const,
      history_label: 'Une demande est déjà en attente',
      history_score_normalized: 0.2,
      badge_tone: 'red' as const,
    }
  }

  if (history.status === 'accepted') {
    return {
      history_status: 'accepted' as const,
      history_label: 'Une demande a déjà été acceptée',
      history_score_normalized: 0.35,
      badge_tone: 'yellow' as const,
    }
  }

  if (history.status === 'declined') {
    return {
      history_status: 'declined_before' as const,
      history_label: 'Une demande précédente a été refusée',
      history_score_normalized: 0.55,
      badge_tone: 'yellow' as const,
    }
  }

  if (history.status === 'expired') {
    return {
      history_status: 'expired_before' as const,
      history_label: 'Une demande précédente a expiré',
      history_score_normalized: 0.7,
      badge_tone: 'yellow' as const,
    }
  }

  return {
    history_status: 'cancelled_before' as const,
    history_label: 'Une demande précédente a été annulée',
    history_score_normalized: 0.75,
    badge_tone: 'yellow' as const,
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
    const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization token' })
    }

    const accessToken = authHeader.slice('Bearer '.length)

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(accessToken)

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { data: requesterFamily, error: requesterFamilyError } = await supabaseAdmin
      .from('families')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (requesterFamilyError || !requesterFamily) {
      return res.status(404).json({ error: 'Family not found' })
    }

    const { data: requesterTripsData, error: requesterTripsError } = await supabaseAdmin
      .from('trips')
      .select(`
        id,
        family_id,
        child_id,
        from_place_id,
        to_place_id,
        from_place_suggestion_id,
        to_place_suggestion_id,
        day_of_week,
        from_time,
        to_time,
        tolerance_min,
        status,
        revision,
        created_at,
        trip_group_id
      `)
      .eq('family_id', requesterFamily.id)
      .eq('status', 'searching')

    if (requesterTripsError) {
      return res.status(500).json({ error: requesterTripsError.message })
    }

    const requesterTrips = ((requesterTripsData ?? []) as TripRow[]).filter(
      isRequesterTripEligible
    )

    if (requesterTrips.length === 0) {
      return res.status(200).json({ results: [] })
    }

    const { data: targetTripsData, error: targetTripsError } = await supabaseAdmin
      .from('trips')
      .select(`
        id,
        family_id,
        child_id,
        from_place_id,
        to_place_id,
        from_place_suggestion_id,
        to_place_suggestion_id,
        day_of_week,
        from_time,
        to_time,
        tolerance_min,
        status,
        revision,
        created_at,
        trip_group_id
      `)
      .in('status', ['searching', 'resolved_open'])

    if (targetTripsError) {
      return res.status(500).json({ error: targetTripsError.message })
    }

    const targetTrips = ((targetTripsData ?? []) as TripRow[]).filter(
      (trip) => trip.family_id !== requesterFamily.id && isTargetTripEligible(trip)
    )

    const targetFamilyIds = Array.from(new Set(targetTrips.map((trip) => trip.family_id)))

    if (targetFamilyIds.length === 0) {
      return res.status(200).json({ results: [] })
    }

    const placeIds = Array.from(
      new Set(
        [
          ...requesterTrips.map((trip) => trip.from_place_id).filter(Boolean),
          ...requesterTrips.map((trip) => trip.to_place_id).filter(Boolean),
          ...targetTrips.map((trip) => trip.from_place_id).filter(Boolean),
          ...targetTrips.map((trip) => trip.to_place_id).filter(Boolean),
        ] as string[]
      )
    )

    const childIds = Array.from(new Set(requesterTrips.map((trip) => trip.child_id)))

    const [
      { data: targetFamiliesData, error: targetFamiliesError },
      { data: placesData, error: placesError },
      { data: childrenData, error: childrenError },
      { data: historyRowsData, error: historyRowsError },
    ] = await Promise.all([
      supabaseAdmin
        .from('families')
        .select('id, parent_first_name, parent_last_name, email')
        .in('id', targetFamilyIds),
      placeIds.length > 0
        ? supabaseAdmin.from('places').select('id, name, city').in('id', placeIds)
        : Promise.resolve({ data: [], error: null }),
      childIds.length > 0
        ? supabaseAdmin.from('children').select('id, first_name').in('id', childIds)
        : Promise.resolve({ data: [], error: null }),
      supabaseAdmin
        .from('contact_requests')
        .select('id, requester_family_id, target_family_id, status, created_at')
        .or(
          `and(requester_family_id.eq.${requesterFamily.id},target_family_id.in.(${targetFamilyIds.join(',')})),and(target_family_id.eq.${requesterFamily.id},requester_family_id.in.(${targetFamilyIds.join(',')}))`
        )
        .order('created_at', { ascending: false }),
    ])

    if (targetFamiliesError) {
      return res.status(500).json({ error: targetFamiliesError.message })
    }

    if (placesError) {
      return res.status(500).json({ error: placesError.message || 'Failed to load places' })
    }

    if (childrenError) {
      return res.status(500).json({ error: childrenError.message || 'Failed to load children' })
    }

    if (historyRowsError) {
      return res.status(500).json({ error: historyRowsError.message })
    }

    const targetFamilies = (targetFamiliesData ?? []) as FamilyRow[]
    const placeMap = Object.fromEntries(((placesData ?? []) as PlaceRow[]).map((p) => [p.id, p]))
    const childMap = Object.fromEntries(((childrenData ?? []) as ChildRow[]).map((c) => [c.id, c]))
    const historyRows = (historyRowsData ?? []) as ContactRequestHistoryRow[]

    const latestHistoryByTargetFamilyId = new Map<string, ContactRequestHistoryRow>()

    for (const row of historyRows) {
      const otherFamilyId =
        row.requester_family_id === requesterFamily.id
          ? row.target_family_id
          : row.requester_family_id

      if (!latestHistoryByTargetFamilyId.has(otherFamilyId)) {
        latestHistoryByTargetFamilyId.set(otherFamilyId, row)
      }
    }

    const targetTripsByFamilyId = new Map<string, TripRow[]>()

    for (const trip of targetTrips) {
      const current = targetTripsByFamilyId.get(trip.family_id) ?? []
      current.push(trip)
      targetTripsByFamilyId.set(trip.family_id, current)
    }

    const results = targetFamilies
      .map((family) => {
        const candidateTrips = targetTripsByFamilyId.get(family.id) ?? []
        const tripMatches: any[] = []

        for (const requesterTrip of requesterTrips) {
          const compatibleTrips = candidateTrips
            .map((targetTrip) => {
              if (requesterTrip.day_of_week !== targetTrip.day_of_week) return null
              if (requesterTrip.from_place_id !== targetTrip.from_place_id) return null
              if (requesterTrip.to_place_id !== targetTrip.to_place_id) return null

              const requesterFromMin = timeToMinutes(requesterTrip.from_time)
              const targetFromMin = timeToMinutes(targetTrip.from_time)

              if (requesterFromMin === null || targetFromMin === null) return null

              const timeDiffMin = Math.abs(requesterFromMin - targetFromMin)
              const allowedDiffMin = Math.min(
                requesterTrip.tolerance_min,
                targetTrip.tolerance_min
              )

              if (timeDiffMin > allowedDiffMin) return null

              const timeFitScore =
                allowedDiffMin === 0
                  ? timeDiffMin === 0
                    ? 100
                    : 0
                  : Math.max(0, Math.round(100 * (1 - timeDiffMin / allowedDiffMin)))

              return {
                requester_trip_id: requesterTrip.id,
                requester_trip_group_id: requesterTrip.trip_group_id,
                requester_child_first_name: childMap[requesterTrip.child_id]?.first_name || null,
                requester_from_label: placeLabel(requesterTrip.from_place_id, placeMap),
                requester_to_label: placeLabel(requesterTrip.to_place_id, placeMap),
                requester_from_time: requesterTrip.from_time,
                requester_to_time: requesterTrip.to_time,
                target_trip_id: targetTrip.id,
                target_trip_group_id: targetTrip.trip_group_id,
                target_from_time: targetTrip.from_time,
                target_to_time: targetTrip.to_time,
                day_of_week: requesterTrip.day_of_week,
                time_diff_min: timeDiffMin,
                allowed_diff_min: allowedDiffMin,
                time_fit_score: timeFitScore,
              }
            })
            .filter(Boolean)
            .sort((a: any, b: any) => b.time_fit_score - a.time_fit_score)

          if (compatibleTrips.length > 0) {
            tripMatches.push(compatibleTrips[0])
          }
        }

        if (tripMatches.length === 0) return null

        const matchedRequesterTripIds = Array.from(
          new Set(tripMatches.map((item) => item.requester_trip_id))
        )

        const coveredDayOfWeekValues = Array.from(
          new Set(tripMatches.map((item) => item.day_of_week))
        ).sort((a, b) => a - b)

        const coverageRatio = matchedRequesterTripIds.length / requesterTrips.length
        const averageTimeFitScore = Math.round(
          tripMatches.reduce((sum, item) => sum + item.time_fit_score, 0) / tripMatches.length
        )

        const history = latestHistoryByTargetFamilyId.get(family.id) ?? null
        const historyInfo = computeHistoryInfo(history)

        const tripCompatibilityScore = Math.round(coverageRatio * 100)
        const compatibilityScore = Math.round(
          tripCompatibilityScore * 0.55 +
            averageTimeFitScore * 0.3 +
            historyInfo.history_score_normalized * 100 * 0.15
        )

        let badge_label = 'Compatible'
        let badge_tone: 'green' | 'yellow' | 'red' = 'yellow'

        if (compatibilityScore >= 80) {
          badge_label = 'Très compatible'
          badge_tone = 'green'
        } else if (compatibilityScore < 60) {
          badge_label = 'À vérifier'
          badge_tone = 'red'
        }

        return {
          target_family_id: family.id,
          target_parent_first_name: family.parent_first_name,
          target_parent_last_name: family.parent_last_name,
          target_email: family.email,
          compatibility_score: compatibilityScore,
          trip_compatibility_score: tripCompatibilityScore,
          history_score_normalized: historyInfo.history_score_normalized,
          coverage_ratio: coverageRatio,
          average_time_fit_score: averageTimeFitScore,
          history_status: historyInfo.history_status,
          history_label: historyInfo.history_label,
          history_request_id: history?.id ?? null,
          history_created_at: history?.created_at ?? null,
          history_contact_email: family.email,
          badge_label,
          badge_tone,
          matched_trip_count: tripMatches.length,
          matched_requester_trip_count: matchedRequesterTripIds.length,
          covered_day_of_week_values: coveredDayOfWeekValues,
          trip_matches: tripMatches,
        }
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.compatibility_score - a.compatibility_score)

    return res.status(200).json({ results })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected server error'

    return res.status(500).json({ error: message })
  }
}