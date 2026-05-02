import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

type TripRow = {
  id: string
  family_id: string
  child_id: string
  from_location_type: 'place' | 'private_address'
  to_location_type: 'place' | 'private_address'
  from_place_id: string | null
  to_place_id: string | null
  from_address: string | null
  to_address: string | null
  from_lat: number | null
  from_lng: number | null
  to_lat: number | null
  to_lng: number | null
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
  status:
    | 'pending'
    | 'accepted'
    | 'declined'
    | 'expired'
    | 'cancelled'
    | 'closed_no_agreement'
    | 'closed_with_agreement'
  created_at: string
}

type HistoryInfo = {
  history_status:
    | 'none_yet'
    | 'pending'
    | 'accepted'
    | 'declined_before'
    | 'expired_before'
    | 'cancelled_before'
  history_label: string
  history_score: number
  history_score_normalized: number
  badge_tone: 'green' | 'yellow' | 'red'
  can_contact: boolean
  contact_block_reason: string | null
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

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function formatDistanceMeters(distanceMeters: number) {
  // On n'affiche pas la distance exacte pour préserver la confidentialité.
  // La distance précise reste utilisée uniquement en interne pour le score et le tri.
  if (distanceMeters < 100) return 'à proximité immédiate'
  if (distanceMeters < 300) return 'très proche'
  if (distanceMeters <= 500) return 'proche'
  return 'hors périmètre'
}

function getDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) {
  const earthRadiusMeters = 6371000
  const toRad = (value: number) => (value * Math.PI) / 180

  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function getDistanceScore(distanceMeters: number) {
  if (distanceMeters < 20) return 30
  if (distanceMeters < 100) return 25
  if (distanceMeters < 200) return 20
  if (distanceMeters < 300) return 15
  if (distanceMeters <= 500) return 5
  return 0
}

function getTimeScore(diffMinutes: number) {
  if (diffMinutes <= 5) return 30
  if (diffMinutes <= 10) return 25
  if (diffMinutes <= 15) return 20
  if (diffMinutes <= 30) return 10
  return 0
}

function locationLabel(
  locationType: TripRow['from_location_type'],
  address: string | null,
  placeId: string | null,
  placeMap: Record<string, PlaceRow>
) {
  if (locationType === 'private_address') {
    return address || 'Adresse privée'
  }

  if (!placeId) return 'Lieu non renseigné'

  const place = placeMap[placeId]
  if (!place) return 'Lieu inconnu'

  return `${place.name} (${place.city})`
}

function isRequesterTripEligible(trip: TripRow): boolean {
  return (
    trip.status === 'searching' &&
    isFiniteNumber(trip.from_lat) &&
    isFiniteNumber(trip.from_lng) &&
    isFiniteNumber(trip.to_lat) &&
    isFiniteNumber(trip.to_lng)
  )
}

function isTargetTripEligible(trip: TripRow): boolean {
  return (
    (trip.status === 'searching' || trip.status === 'resolved_open') &&
    isFiniteNumber(trip.from_lat) &&
    isFiniteNumber(trip.from_lng) &&
    isFiniteNumber(trip.to_lat) &&
    isFiniteNumber(trip.to_lng)
  )
}

function hoursSince(value: string) {
  const createdAtMs = new Date(value).getTime()

  if (!Number.isFinite(createdAtMs)) return Number.POSITIVE_INFINITY

  return (Date.now() - createdAtMs) / (1000 * 60 * 60)
}

function normalizeHistoryScore(historyScore: number) {
  // Valeur conservée pour l'ancien affichage : -10 => 0, 0 => 0.5, +10 => 1.
  return Math.max(0, Math.min(1, (historyScore + 10) / 20))
}

function computeHistoryInfo(history: ContactRequestHistoryRow | null): HistoryInfo {
  if (!history) {
    return {
      history_status: 'none_yet',
      history_label: 'Aucun échange historique',
      history_score: 0,
      history_score_normalized: normalizeHistoryScore(0),
      badge_tone: 'green',
      can_contact: true,
      contact_block_reason: null,
    }
  }

  if (history.status === 'pending') {
    const isRecentPending = hoursSince(history.created_at) < 24

    if (isRecentPending) {
      return {
        history_status: 'pending',
        history_label: 'Demande en attente',
        history_score: 0,
        history_score_normalized: normalizeHistoryScore(0),
        badge_tone: 'yellow',
        can_contact: false,
        contact_block_reason:
          'Demande déjà envoyée récemment. Vous pourrez refaire une demande plus tard.',
      }
    }

    return {
      history_status: 'expired_before',
      history_label: 'Demande déjà envoyée mais sans réponse',
      history_score: -5,
      history_score_normalized: normalizeHistoryScore(-5),
      badge_tone: 'yellow',
      can_contact: true,
      contact_block_reason: null,
    }
  }

  if (history.status === 'accepted' || history.status === 'closed_with_agreement') {
    return {
      history_status: 'accepted',
      history_label: 'Mise en relation déjà acceptée',
      history_score: 10,
      history_score_normalized: normalizeHistoryScore(10),
      badge_tone: 'green',
      can_contact: true,
      contact_block_reason: null,
    }
  }

  if (history.status === 'declined' || history.status === 'closed_no_agreement') {
    return {
      history_status: 'declined_before',
      history_label: 'Demande déjà refusée',
      history_score: -10,
      history_score_normalized: normalizeHistoryScore(-10),
      badge_tone: 'red',
      can_contact: true,
      contact_block_reason: null,
    }
  }

  if (history.status === 'expired') {
    return {
      history_status: 'expired_before',
      history_label: 'Demande déjà envoyée mais sans réponse',
      history_score: -5,
      history_score_normalized: normalizeHistoryScore(-5),
      badge_tone: 'yellow',
      can_contact: true,
      contact_block_reason: null,
    }
  }

  return {
    history_status: 'cancelled_before',
    history_label: 'Demande précédente annulée',
    history_score: 0,
    history_score_normalized: normalizeHistoryScore(0),
    badge_tone: 'yellow',
    can_contact: true,
    contact_block_reason: null,
  }
}

function compareTrips(
  requesterTrip: TripRow,
  targetTrip: TripRow,
  historyInfo: HistoryInfo,
  placeMap: Record<string, PlaceRow>,
  childMap: Record<string, ChildRow>
) {
  if (requesterTrip.day_of_week !== targetTrip.day_of_week) return null

  if (
    !isFiniteNumber(requesterTrip.from_lat) ||
    !isFiniteNumber(requesterTrip.from_lng) ||
    !isFiniteNumber(requesterTrip.to_lat) ||
    !isFiniteNumber(requesterTrip.to_lng) ||
    !isFiniteNumber(targetTrip.from_lat) ||
    !isFiniteNumber(targetTrip.from_lng) ||
    !isFiniteNumber(targetTrip.to_lat) ||
    !isFiniteNumber(targetTrip.to_lng)
  ) {
    return null
  }

  const fromDistanceMeters = getDistanceMeters(
    requesterTrip.from_lat,
    requesterTrip.from_lng,
    targetTrip.from_lat,
    targetTrip.from_lng
  )

  if (fromDistanceMeters > 500) return null

  const toDistanceMeters = getDistanceMeters(
    requesterTrip.to_lat,
    requesterTrip.to_lng,
    targetTrip.to_lat,
    targetTrip.to_lng
  )

  if (toDistanceMeters > 500) return null

  const requesterFromMin = timeToMinutes(requesterTrip.from_time)
  const targetFromMin = timeToMinutes(targetTrip.from_time)

  if (requesterFromMin === null || targetFromMin === null) return null

  const timeDiffMin = Math.abs(requesterFromMin - targetFromMin)

  if (timeDiffMin > 30) return null

  const fromDistanceScore = getDistanceScore(fromDistanceMeters)
  const toDistanceScore = getDistanceScore(toDistanceMeters)
  const timeScore = getTimeScore(timeDiffMin)
  const compatibilityScore =
    fromDistanceScore + toDistanceScore + timeScore + historyInfo.history_score

  return {
    requester_trip_id: requesterTrip.id,
    requester_trip_group_id: requesterTrip.trip_group_id,
    requester_child_first_name: childMap[requesterTrip.child_id]?.first_name || null,
    requester_from_label: locationLabel(
      requesterTrip.from_location_type,
      requesterTrip.from_address,
      requesterTrip.from_place_id,
      placeMap
    ),
    requester_to_label: locationLabel(
      requesterTrip.to_location_type,
      requesterTrip.to_address,
      requesterTrip.to_place_id,
      placeMap
    ),
    requester_from_time: requesterTrip.from_time,
    requester_to_time: requesterTrip.to_time,
    target_trip_id: targetTrip.id,
    target_trip_group_id: targetTrip.trip_group_id,
    target_from_time: targetTrip.from_time,
    target_to_time: targetTrip.to_time,
    day_of_week: requesterTrip.day_of_week,
    time_diff_min: timeDiffMin,
    allowed_diff_min: 30,
    time_fit_score: Math.round((timeScore / 30) * 100),
    from_distance_m: Math.round(fromDistanceMeters),
    to_distance_m: Math.round(toDistanceMeters),
    from_distance_label: formatDistanceMeters(fromDistanceMeters),
    to_distance_label: formatDistanceMeters(toDistanceMeters),
    from_distance_score: fromDistanceScore,
    to_distance_score: toDistanceScore,
    time_score: timeScore,
    history_score: historyInfo.history_score,
    compatibility_score: compatibilityScore,
  }
}

type TripMatch = NonNullable<ReturnType<typeof compareTrips>>

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
        from_location_type,
        to_location_type,
        from_place_id,
        to_place_id,
        from_address,
        to_address,
        from_lat,
        from_lng,
        to_lat,
        to_lng,
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
        from_location_type,
        to_location_type,
        from_place_id,
        to_place_id,
        from_address,
        to_address,
        from_lat,
        from_lng,
        to_lat,
        to_lng,
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

    const contactHistoryQuery = targetFamilyIds
      .map(
        (targetFamilyId) =>
          `and(requester_family_id.eq.${requesterFamily.id},target_family_id.eq.${targetFamilyId}),and(target_family_id.eq.${requesterFamily.id},requester_family_id.eq.${targetFamilyId})`
      )
      .join(',')

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
      contactHistoryQuery
        ? supabaseAdmin
            .from('contact_requests')
            .select('id, requester_family_id, target_family_id, status, created_at')
            .or(contactHistoryQuery)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
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
        const history = latestHistoryByTargetFamilyId.get(family.id) ?? null
        const historyInfo = computeHistoryInfo(history)
        const tripMatches: TripMatch[] = []

        for (const requesterTrip of requesterTrips) {
          const compatibleTrips = candidateTrips
            .map((targetTrip) =>
              compareTrips(requesterTrip, targetTrip, historyInfo, placeMap, childMap)
            )
            .filter((item): item is TripMatch => item !== null)
            .sort((a, b) => b.compatibility_score - a.compatibility_score)

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

        const averageTripScoreWithoutHistory = Math.round(
          tripMatches.reduce(
            (sum, item) =>
              sum + item.from_distance_score + item.to_distance_score + item.time_score,
            0
          ) / tripMatches.length
        )

        const compatibilityScore = Math.round(
          tripMatches.reduce((sum, item) => sum + item.compatibility_score, 0) /
            tripMatches.length
        )

        if (compatibilityScore < 50) return null

        let badge_label = 'Possible'
        let badge_tone: 'green' | 'yellow' | 'red' = 'red'

        if (compatibilityScore >= 85) {
          badge_label = 'Très compatible'
          badge_tone = 'green'
        } else if (compatibilityScore >= 70) {
          badge_label = 'Compatible'
          badge_tone = 'yellow'
        }

        return {
          target_family_id: family.id,
          target_parent_first_name: family.parent_first_name,
          target_parent_last_name: family.parent_last_name,
          target_email: family.email,
          compatibility_score: compatibilityScore,
          trip_compatibility_score: averageTripScoreWithoutHistory,
          history_score: historyInfo.history_score,
          history_score_normalized: historyInfo.history_score_normalized,
          coverage_ratio: coverageRatio,
          average_time_fit_score: averageTimeFitScore,
          history_status: historyInfo.history_status,
          history_label: historyInfo.history_label,
          history_request_id: history?.id ?? null,
          history_created_at: history?.created_at ?? null,
          history_contact_email: family.email,
          can_contact: historyInfo.can_contact,
          contact_block_reason: historyInfo.contact_block_reason,
          badge_label,
          badge_tone,
          matched_trip_count: tripMatches.length,
          matched_requester_trip_count: matchedRequesterTripIds.length,
          covered_day_of_week_values: coveredDayOfWeekValues,
          trip_matches: tripMatches,
        }
      })

      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.compatibility_score - a.compatibility_score)

    return res.status(200).json({ results })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected server error'

    return res.status(500).json({ error: message })
  }
}
