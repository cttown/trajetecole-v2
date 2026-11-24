import { supabase } from './supabaseClient'

type TrackEventInput = {
  eventType: 'page_view' | 'trip_created' | 'match_request_sent' | 'contact_admin_sent' | 'signup'
  page?: string
  path?: string
  metadata?: Record<string, unknown>
}

const NOTRACK_KEY = 'te_notrack'

/**
 * Interrupteur « ne pas me compter », par appareil :
 * - visiter une page avec ?notrack active l'exclusion (mémorisée durablement) ;
 * - visiter avec ?track la désactive.
 * Renvoie true si cet appareil ne doit pas être suivi.
 */
function isSelfExcluded(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.has('notrack')) {
      window.localStorage.setItem(NOTRACK_KEY, '1')
    } else if (params.has('track')) {
      window.localStorage.removeItem(NOTRACK_KEY)
    }
    return window.localStorage.getItem(NOTRACK_KEY) === '1'
  } catch {
    return false
  }
}

export async function trackEvent({
  eventType,
  page,
  path,
  metadata,
}: TrackEventInput) {
  try {
    // Appareil exclu volontairement (interrupteur ?notrack) : on ne suit rien.
    if (isSelfExcluded()) return

    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Les vues de page d'un utilisateur connecté (toi en admin/test, ou simple
    // navigation interne) ne sont pas comptées dans l'audience du site.
    // Les événements d'action (trip_created, match_request_sent, etc.) restent
    // enregistrés même connecté.
    if (eventType === 'page_view' && session) return

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
