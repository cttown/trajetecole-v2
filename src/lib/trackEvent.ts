import { supabase } from './supabaseClient'

type TrackEventInput = {
  eventType: 'page_view' | 'trip_created' | 'match_request_sent' | 'contact_admin_sent' | 'signup'
  page?: string
  path?: string
  metadata?: Record<string, unknown>
}

export async function trackEvent({
  eventType,
  page,
  path,
  metadata,
}: TrackEventInput) {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    await fetch('/api/events/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_type: eventType,
        page: page ?? null,
        path: path ?? null,
        metadata: metadata ?? null,
        user_id: session?.user?.id ?? null,
      }),
    })
  } catch (error) {
    console.error('trackEvent error:', error)
  }
}