import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import {
  buildEmailLayout,
  createContactRequestEmailActionToken,
  sendEmail,
} from '../../../lib/email'
import {
  CONTACT_REQUEST_PRIORITY_MS,
  getPriorityDelayText,
} from '../../../lib/contactRequestConfig'

type CreateContactRequestBody = {
  target_family_id: string
  requester_trip_ids: string[]
}

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
  status: 'searching' | 'resolved' | 'paused' | 'archived'
  accepting_new_children: boolean
  revision: number
  created_at: string
  trip_group_id: string
}

type ContactRequestRow = {
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
  expires_at: string
  accepted_at: string | null
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

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }
  return value
}

function getAppBaseUrl() {
  return requireEnv('APP_BASE_URL')
}

function displayParentName(family: FamilyRow) {
  const full = `${family.parent_first_name ?? ''} ${family.parent_last_name ?? ''}`.trim()
  return full || family.email
}

function isTripEligible(trip: TripRow): boolean {
  return (
    trip.status === 'searching' &&
    !!trip.from_place_id &&
    !!trip.to_place_id &&
    !trip.from_place_suggestion_id &&
    !trip.to_place_suggestion_id
  )
}

function timeToMinutes(value: string | null): number | null {
  if (!value) return null

  const parts = value.split(':')
  if (parts.length < 2) return null

  const hours = Number(parts[0])
  const minutes = Number(parts[1])

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null

  return hours * 60 + minutes
}

function areTripsCompatible(requesterTrip: TripRow, targetTrip: TripRow): boolean {
  if (requesterTrip.family_id === targetTrip.family_id) return false
  if (!isTripEligible(requesterTrip) || !isTripEligible(targetTrip)) return false

  if (requesterTrip.day_of_week !== targetTrip.day_of_week) return false
  if (requesterTrip.from_place_id !== targetTrip.from_place_id) return false
  if (requesterTrip.to_place_id !== targetTrip.to_place_id) return false

  const requesterMin = timeToMinutes(requesterTrip.from_time)
  const targetMin = timeToMinutes(targetTrip.from_time)

  if (requesterMin === null || targetMin === null) return false

  const timeDiffMin = Math.abs(requesterMin - targetMin)
  const allowedDiffMin = Math.min(
    requesterTrip.tolerance_min ?? 0,
    targetTrip.tolerance_min ?? 0
  )

  return timeDiffMin <= allowedDiffMin
}

function formatDay(dayOfWeek: number) {
  const labels: Record<number, string> = {
    1: 'Lundi',
    2: 'Mardi',
    3: 'Mercredi',
    4: 'Jeudi',
    5: 'Vendredi',
    6: 'Samedi',
    7: 'Dimanche',
  }

  return labels[dayOfWeek] || `Jour ${dayOfWeek}`
}

function formatHour(value: string | null) {
  if (!value) return '—'
  return value.slice(0, 5)
}

function formatTripTimeRange(trip: TripRow) {
  return trip.to_time ? `${formatHour(trip.from_time)} → ${formatHour(trip.to_time)}` : formatHour(trip.from_time)
}

function formatPlace(placeId: string | null, placeMap: Record<string, PlaceRow>) {
  if (!placeId) return 'Lieu non renseigné'
  const place = placeMap[placeId]
  if (!place) return 'Lieu inconnu'
  return `${place.name} (${place.city})`
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = req.body as CreateContactRequestBody
    const targetFamilyId = body?.target_family_id
    const requesterTripIds = Array.isArray(body?.requester_trip_ids)
      ? Array.from(new Set(body.requester_trip_ids.filter(Boolean)))
      : []

    if (!targetFamilyId) {
      return res.status(400).json({ error: 'target_family_id is required' })
    }

    if (requesterTripIds.length === 0) {
      return res.status(400).json({ error: 'requester_trip_ids is required' })
    }

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
      .select('id, parent_first_name, parent_last_name, email')
      .eq('auth_user_id', user.id)
      .single()

    if (requesterFamilyError || !requesterFamily) {
      return res.status(404).json({ error: 'Requester family not found' })
    }

    if (requesterFamily.id === targetFamilyId) {
      return res.status(400).json({ error: 'Cannot contact your own family' })
    }

    const { data: targetFamily, error: targetFamilyError } = await supabaseAdmin
      .from('families')
      .select('id, parent_first_name, parent_last_name, email')
      .eq('id', targetFamilyId)
      .single()

    if (targetFamilyError || !targetFamily) {
      return res.status(404).json({ error: 'Target family not found' })
    }

    const nowIso = new Date().toISOString()

    const { data: latestExistingRequest, error: latestExistingRequestError } = await supabaseAdmin
      .from('contact_requests')
      .select(`
        id,
        requester_family_id,
        target_family_id,
        status,
        created_at,
        expires_at,
        accepted_at
      `)
      .or(
        `and(requester_family_id.eq.${requesterFamily.id},target_family_id.eq.${targetFamilyId}),and(requester_family_id.eq.${targetFamilyId},target_family_id.eq.${requesterFamily.id})`
      )
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestExistingRequestError) {
      return res.status(500).json({ error: latestExistingRequestError.message })
    }

    if (latestExistingRequest) {
      const request = latestExistingRequest as ContactRequestRow
      const target = targetFamily as FamilyRow
      const targetName = displayParentName(target)

      const isStillExclusive =
        request.status === 'pending' &&
        new Date(request.expires_at).getTime() > Date.now()

      if (isStillExclusive) {
        return res.status(409).json({
          error: `Vous avez déjà une demande en attente avec ${targetName}. Le délai de priorité court jusqu’au ${new Date(
            request.expires_at
          ).toLocaleString('fr-FR')}.`,
          code: 'REQUEST_ALREADY_PENDING',
          request_id: request.id,
          status: request.status,
          created_at: request.created_at,
          expires_at: request.expires_at,
        })
      }

      if (request.status === 'accepted' || request.status === 'closed_with_agreement') {
        return res.status(409).json({
          error: `Vous êtes déjà en contact avec ${targetName} depuis le ${new Date(
            request.accepted_at ?? request.created_at
          ).toLocaleString('fr-FR')}. Email : ${target.email}`,
          code: 'REQUEST_ALREADY_ACCEPTED',
          request_id: request.id,
          status: request.status,
          created_at: request.created_at,
          accepted_at: request.accepted_at,
          contact_email: target.email,
        })
      }
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
        accepting_new_children,
        revision,
        created_at,
        trip_group_id
      `)
      .in('id', requesterTripIds)

    if (requesterTripsError) {
      return res.status(500).json({ error: requesterTripsError.message })
    }

    const requesterTrips = (requesterTripsData ?? []) as TripRow[]

    if (requesterTrips.length !== requesterTripIds.length) {
      return res.status(400).json({ error: 'Some requester trips were not found' })
    }

    const invalidRequesterTrip = requesterTrips.find(
      (trip) => trip.family_id !== requesterFamily.id || !isTripEligible(trip)
    )

    if (invalidRequesterTrip) {
      return res.status(400).json({
        error: 'Some requester trips are not eligible',
      })
    }

    const { data: activeTripLinks, error: activeTripLinksError } = await supabaseAdmin
      .from('contact_request_trips')
      .select(`
        requester_trip_id,
        contact_requests!inner (
          id,
          status,
          expires_at
        )
      `)
      .in('requester_trip_id', requesterTripIds)

    if (activeTripLinksError) {
      return res.status(500).json({ error: activeTripLinksError.message })
    }

    const hasBlockingLink = (activeTripLinks ?? []).some((link: any) => {
      const request = Array.isArray(link.contact_requests)
        ? link.contact_requests[0]
        : link.contact_requests

      if (!request) return false
      if (request.status === 'accepted') return true

      if (request.status === 'pending') {
        return new Date(request.expires_at).getTime() > Date.now()
      }

      return false
    })

    if (hasBlockingLink) {
      return res.status(409).json({
        error:
          'Au moins un trajet sélectionné est déjà engagé dans une demande active ou encore pendant le délai de priorité.',
        code: 'REQUESTER_TRIP_ALREADY_ENGAGED',
      })
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
        accepting_new_children,
        revision,
        created_at,
        trip_group_id
      `)
      .eq('family_id', targetFamilyId)
      .eq('status', 'searching')

    if (targetTripsError) {
      return res.status(500).json({ error: targetTripsError.message })
    }

    const targetTrips = ((targetTripsData ?? []) as TripRow[]).filter(isTripEligible)

    const matchedPairs: { requester_trip_id: string; target_trip_id: string }[] = []

    for (const requesterTrip of requesterTrips) {
      const compatibleTargetTrips = targetTrips.filter((targetTrip) =>
        areTripsCompatible(requesterTrip, targetTrip)
      )

      if (compatibleTargetTrips.length === 0) {
        return res.status(409).json({
          error: 'Certains trajets sélectionnés ne sont plus compatibles avec cette famille.',
          code: 'NO_LONGER_COMPATIBLE',
        })
      }

      compatibleTargetTrips.sort((a, b) => {
        const aDiff =
          Math.abs((timeToMinutes(requesterTrip.from_time) ?? 0) - (timeToMinutes(a.from_time) ?? 0))
        const bDiff =
          Math.abs((timeToMinutes(requesterTrip.from_time) ?? 0) - (timeToMinutes(b.from_time) ?? 0))
        return aDiff - bDiff
      })

      matchedPairs.push({
        requester_trip_id: requesterTrip.id,
        target_trip_id: compatibleTargetTrips[0].id,
      })
    }

    const expiresAt = new Date(Date.now() + CONTACT_REQUEST_PRIORITY_MS).toISOString()

    const { data: createdRequest, error: createRequestError } = await supabaseAdmin
      .from('contact_requests')
      .insert({
        requester_family_id: requesterFamily.id,
        target_family_id: targetFamilyId,
        status: 'pending',
        expires_at: expiresAt,
      })
      .select('id, requester_family_id, target_family_id, status, created_at, expires_at, accepted_at')
      .single()

    if (createRequestError || !createdRequest) {
      return res.status(500).json({
        error: createRequestError?.message || 'Failed to create request',
      })
    }

    const tripRows = matchedPairs.map((pair) => ({
      contact_request_id: createdRequest.id,
      requester_trip_id: pair.requester_trip_id,
      target_trip_id: pair.target_trip_id,
    }))

    const { error: createTripRowsError } = await supabaseAdmin
      .from('contact_request_trips')
      .insert(tripRows)

    if (createTripRowsError) {
      await supabaseAdmin
        .from('contact_requests')
        .delete()
        .eq('id', createdRequest.id)

      return res.status(500).json({
        error: createTripRowsError.message,
      })
    }

    try {
      const requesterChildIds = Array.from(new Set(requesterTrips.map((trip) => trip.child_id)))
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

      const [{ data: childRows }, { data: placeRows }] = await Promise.all([
        requesterChildIds.length > 0
          ? supabaseAdmin.from('children').select('id, first_name').in('id', requesterChildIds)
          : Promise.resolve({ data: [] as ChildRow[] }),
        placeIds.length > 0
          ? supabaseAdmin.from('places').select('id, name, city').in('id', placeIds)
          : Promise.resolve({ data: [] as PlaceRow[] }),
      ])

      const childMap = Object.fromEntries(((childRows ?? []) as ChildRow[]).map((child) => [child.id, child]))
      const placeMap = Object.fromEntries(((placeRows ?? []) as PlaceRow[]).map((place) => [place.id, place]))

      const targetTripMap = Object.fromEntries(targetTrips.map((trip) => [trip.id, trip]))

      const tripLines = matchedPairs.flatMap((pair, index) => {
        const requesterTrip = requesterTrips.find((trip) => trip.id === pair.requester_trip_id)!
        const targetTrip = targetTripMap[pair.target_trip_id]
        const child = childMap[requesterTrip.child_id]

        return [
          `Trajet ${index + 1}`,
          `Enfant : ${child?.first_name || '—'}`,
          `Jour : ${formatDay(requesterTrip.day_of_week)}`,
          `Votre horaire : ${formatTripTimeRange(requesterTrip)}`,
          `Départ : ${formatPlace(requesterTrip.from_place_id, placeMap)}`,
          `Arrivée : ${formatPlace(requesterTrip.to_place_id, placeMap)}`,
          `Horaire de l’autre famille : ${targetTrip ? formatTripTimeRange(targetTrip) : '—'}`,
          ' ',
        ]
      })

      const appBaseUrl = getAppBaseUrl()

      const acceptToken = createContactRequestEmailActionToken({
        requestId: createdRequest.id,
        targetFamilyId: targetFamily.id,
        action: 'accept',
        exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
      })

      const declineToken = createContactRequestEmailActionToken({
        requestId: createdRequest.id,
        targetFamilyId: targetFamily.id,
        action: 'decline',
        exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
      })

      await sendEmail({
        to: targetFamily.email,
        subject: 'Nouvelle demande de mise en relation sur TrajetEcole',
        html: buildEmailLayout({
          title: 'Nouvelle demande de mise en relation',
          intro: `${displayParentName(requesterFamily as FamilyRow)} souhaite entrer en contact avec vous sur TrajetEcole.`,
          sections: [
            {
              title: 'Informations générales',
              lines: [
                `Nombre de trajets concernés : ${tripRows.length}`,
                `Délai de priorité jusqu’au : ${new Date(createdRequest.expires_at).toLocaleString('fr-FR')}`,
                `Pendant le délai de priorité (${getPriorityDelayText()}), une nouvelle demande ne peut pas être envoyée pour ce même trajet.`,
              ],
            },
            {
              title: 'Détail des trajets concernés',
              lines: tripLines,
            },
          ],
          buttons: [
            {
              label: 'Accepter',
              url: `${appBaseUrl}/api/contact-requests/email-action?token=${encodeURIComponent(
                acceptToken
              )}`,
              kind: 'primary',
            },
            {
              label: 'Refuser',
              url: `${appBaseUrl}/api/contact-requests/email-action?token=${encodeURIComponent(
                declineToken
              )}`,
              kind: 'secondary',
            },
            {
              label: 'Voir mon espace',
              url: `${appBaseUrl}/dashboard`,
              kind: 'secondary',
            },
          ],
          footerNote:
            'Vous pouvez répondre directement depuis cet email ou retrouver cette demande dans votre espace TrajetEcole.',
        }),
      })
    } catch (emailError) {
      console.error('Failed to send contact request email:', emailError)
    }

    return res.status(200).json({
      request: createdRequest as ContactRequestRow,
      linked_trip_count: tripRows.length,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected server error'

    return res.status(500).json({ error: message })
  }
}