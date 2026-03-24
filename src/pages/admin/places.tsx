import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'

type Place = {
  id: string
  name: string
  kind: 'school' | 'activity' | 'other'
  city: string
  exact_address: string | null
  postal_code: string | null
  is_active: boolean
  created_at: string
}

type PlaceSuggestion = {
  id: string
  family_id: string
  suggested_name: string
  kind: 'school' | 'activity' | 'other'
  city: string
  exact_address: string | null
  postal_code: string | null
  comment: string | null
  status: 'pending' | 'approved_new_place' | 'mapped_to_existing_place' | 'rejected'
  resolved_place_id: string | null
  review_note: string | null
  created_at: string
  reviewed_at: string | null
}

function formatPlaceKind(kind: Place['kind']) {
  if (kind === 'school') return 'École'
  if (kind === 'activity') return 'Activité'
  return 'Autre'
}

export default function AdminPlacesPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [isForbidden, setIsForbidden] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [places, setPlaces] = useState<Place[]>([])

  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({})
  const [mappingChoice, setMappingChoice] = useState<Record<string, string>>({})
  const [workingId, setWorkingId] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadPage() {
      try {
        setError('')
        setSuccess('')
        setLoading(true)

        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          router.replace('/login')
          return
        }

        const { data: adminRow, error: adminError } = await supabase
          .from('admin_users')
          .select('user_id')
          .eq('user_id', session.user.id)
          .maybeSingle()

        if (adminError) {
          throw new Error(adminError.message)
        }

        if (!adminRow) {
          if (isMounted) {
            setIsForbidden(true)
            setLoading(false)
          }
          return
        }

        const { data: suggestionsData, error: suggestionsError } = await supabase
          .from('place_suggestions')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: true })

        if (suggestionsError) {
          throw new Error(suggestionsError.message)
        }

        const { data: placesData, error: placesError } = await supabase
          .from('places')
          .select('*')
          .eq('is_active', true)
          .order('name', { ascending: true })

        if (placesError) {
          throw new Error(placesError.message)
        }

        if (isMounted) {
          setSuggestions(suggestionsData ?? [])
          setPlaces(placesData ?? [])
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Erreur inconnue')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadPage()

    return () => {
      isMounted = false
    }
  }, [router])

  async function callReviewApi(body: Record<string, unknown>) {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.access_token) {
      throw new Error('Session invalide')
    }

    const response = await fetch('/api/admin/place-suggestions/review', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    })

    const json = await response.json()

    if (!response.ok) {
      throw new Error(json.error || 'Erreur API')
    }

    return json
  }

  async function approveAsNewPlace(suggestionId: string) {
    try {
      setError('')
      setSuccess('')
      setWorkingId(suggestionId)

      await callReviewApi({
        action: 'approve_new_place',
        suggestionId,
        reviewNote: reviewNotes[suggestionId] || '',
      })

      setSuggestions((prev) => prev.filter((item) => item.id !== suggestionId))
      setSuccess('Suggestion validée comme nouveau lieu.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setWorkingId(null)
    }
  }

  async function mapToExistingPlace(suggestionId: string) {
    try {
      const resolvedPlaceId = mappingChoice[suggestionId]
      if (!resolvedPlaceId) {
        setError('Choisis un lieu existant.')
        return
      }

      setError('')
      setSuccess('')
      setWorkingId(suggestionId)

      await callReviewApi({
        action: 'map_to_existing_place',
        suggestionId,
        resolvedPlaceId,
        reviewNote: reviewNotes[suggestionId] || '',
      })

      setSuggestions((prev) => prev.filter((item) => item.id !== suggestionId))
      setSuccess('Suggestion associée à un lieu existant.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setWorkingId(null)
    }
  }

  async function rejectSuggestion(suggestionId: string) {
    try {
      setError('')
      setSuccess('')
      setWorkingId(suggestionId)

      await callReviewApi({
        action: 'reject',
        suggestionId,
        reviewNote: reviewNotes[suggestionId] || '',
      })

      setSuggestions((prev) => prev.filter((item) => item.id !== suggestionId))
      setSuccess('Suggestion rejetée.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setWorkingId(null)
    }
  }

  const placesByLabel = useMemo(
    () =>
      places.map((place) => ({
        id: place.id,
        label: `${place.name} (${place.city})`,
      })),
    [places]
  )

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des lieux</h1>
        <p className="mt-2 text-gray-600">Chargement...</p>
      </main>
    )
  }

  if (isForbidden) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          Accès refusé. Cette page est réservée aux administrateurs.
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des suggestions de lieux</h1>
          <p className="mt-1 text-sm text-gray-600">
            Vérifier les lieux proposés par les utilisateurs, les valider, les associer à un lieu
            existant ou les rejeter.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Retour admin
          </Link>
          <Link
            href="/admin/messages"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Voir les messages
          </Link>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
          {success}
        </div>
      ) : null}

      <section className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
        <div className="font-medium">Rappel</div>
        <p className="mt-1 text-sm">
          Les lieux proposés par les familles ne doivent être pris en compte dans la recherche
          qu’après validation ou association à un lieu existant.
        </p>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-600">Suggestions en attente</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">{suggestions.length}</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-600">Lieux actifs existants</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">{places.length}</div>
        </div>
      </section>

      {suggestions.length === 0 ? (
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Aucune suggestion en attente.</p>
        </section>
      ) : (
        <div className="space-y-5">
          {suggestions.map((item) => {
            const isWorking = workingId === item.id

            return (
              <section
                key={item.id}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 border-b border-gray-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{item.suggested_name}</h2>
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      <div>
                        <strong>Type :</strong> {formatPlaceKind(item.kind)}
                      </div>
                      <div>
                        <strong>Ville :</strong> {item.city}
                      </div>
                      <div>
                        <strong>Adresse :</strong> {item.exact_address || '—'}
                      </div>
                      <div>
                        <strong>Code postal :</strong> {item.postal_code || '—'}
                      </div>
                      <div>
                        <strong>Commentaire :</strong> {item.comment || '—'}
                      </div>
                      <div>
                        <strong>Proposé le :</strong>{' '}
                        {new Date(item.created_at).toLocaleString('fr-FR')}
                      </div>
                    </div>
                  </div>

                  <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                    En attente
                  </span>
                </div>

                <div className="mt-5">
                  <label
                    htmlFor={`review-note-${item.id}`}
                    className="block text-sm font-semibold text-gray-900"
                  >
                    Note admin
                  </label>
                  <textarea
                    id={`review-note-${item.id}`}
                    rows={4}
                    value={reviewNotes[item.id] || ''}
                    onChange={(e) =>
                      setReviewNotes((prev) => ({
                        ...prev,
                        [item.id]: e.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                    placeholder="Ajouter une note interne ou un commentaire de traitement..."
                    disabled={isWorking}
                  />
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                  <div>
                    <label
                      htmlFor={`mapping-${item.id}`}
                      className="block text-sm font-semibold text-gray-900"
                    >
                      Associer à un lieu existant
                    </label>
                    <select
                      id={`mapping-${item.id}`}
                      value={mappingChoice[item.id] || ''}
                      onChange={(e) =>
                        setMappingChoice((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                      disabled={isWorking}
                      className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                    >
                      <option value="">Choisir un lieu existant</option>
                      {placesByLabel.map((place) => (
                        <option key={place.id} value={place.id}>
                          {place.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => mapToExistingPlace(item.id)}
                    disabled={isWorking}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    Associer
                  </button>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => approveAsNewPlace(item.id)}
                    disabled={isWorking}
                    className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
                  >
                    {isWorking ? 'Traitement...' : 'Valider comme nouveau lieu'}
                  </button>

                  <button
                    type="button"
                    onClick={() => rejectSuggestion(item.id)}
                    disabled={isWorking}
                    className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    {isWorking ? 'Traitement...' : 'Rejeter'}
                  </button>
                </div>
              </section>
            )
          })}
        </div>
      )}
    </main>
  )
}