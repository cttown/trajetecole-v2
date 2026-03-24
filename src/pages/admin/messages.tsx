import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'

type MessageStatus = 'new' | 'in_progress' | 'handled'

type AdminMessage = {
  id: string
  parent_first_name?: string | null
  parent_last_name?: string | null
  email: string
  subject: string
  message: string
  status: MessageStatus
  admin_note?: string | null
  created_at: string
  handled_at?: string | null
  handled_by?: string | null
}

const FILTERS: Array<{ label: string; value: 'all' | MessageStatus }> = [
  { label: 'Tous', value: 'all' },
  { label: 'Nouveaux', value: 'new' },
  { label: 'En cours', value: 'in_progress' },
  { label: 'Traités', value: 'handled' },
]

function getSender(message: AdminMessage) {
  const fullName = [message.parent_first_name, message.parent_last_name]
    .filter(Boolean)
    .join(' ')
    .trim()

  return fullName || message.email
}

function formatStatusLabel(status: MessageStatus) {
  if (status === 'new') return 'Nouveau'
  if (status === 'in_progress') return 'En cours'
  return 'Traité'
}

function statusBadgeClass(status: MessageStatus) {
  if (status === 'new') {
    return 'bg-blue-50 text-blue-700 border-blue-200'
  }
  if (status === 'in_progress') {
    return 'bg-amber-50 text-amber-700 border-amber-200'
  }
  return 'bg-green-50 text-green-700 border-green-200'
}

export default function AdminMessagesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isForbidden, setIsForbidden] = useState(false)
  const [messages, setMessages] = useState<AdminMessage[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | MessageStatus>('all')
  const [adminNoteDraft, setAdminNoteDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const selectedMessage = useMemo(
    () => messages.find((m) => m.id === selectedId) ?? null,
    [messages, selectedId]
  )

  useEffect(() => {
    let isMounted = true

    async function load() {
      try {
        setLoading(true)
        setError(null)
        setSuccess(null)

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
          throw new Error("Impossible de vérifier l'accès administrateur.")
        }

        if (!adminRow) {
          if (isMounted) {
            setIsForbidden(true)
            setLoading(false)
          }
          return
        }

        const qs = filter === 'all' ? '' : `?status=${filter}`

        const response = await fetch(`/api/admin/messages${qs}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        const json = await response.json()

        if (!response.ok) {
          throw new Error(json.error || 'Erreur lors du chargement des messages.')
        }

        if (isMounted) {
          const nextMessages = (json.messages ?? []) as AdminMessage[]
          setMessages(nextMessages)

          setSelectedId((current) => {
            if (current && nextMessages.some((m) => m.id === current)) return current
            return nextMessages[0]?.id ?? null
          })
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

    load()

    return () => {
      isMounted = false
    }
  }, [router, filter])

  useEffect(() => {
    setAdminNoteDraft(selectedMessage?.admin_note ?? '')
  }, [selectedMessage])

  async function updateMessage(payload: Partial<Pick<AdminMessage, 'status' | 'admin_note'>>) {
    if (!selectedMessage) return

    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login')
        return
      }

      const response = await fetch('/api/admin/messages', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id: selectedMessage.id,
          ...payload,
        }),
      })

      const json = await response.json()

      if (!response.ok) {
        throw new Error(json.error || 'Erreur lors de la mise à jour.')
      }

      const updatedMessage = json.message as AdminMessage

      setMessages((prev) =>
        prev.map((message) => (message.id === updatedMessage.id ? updatedMessage : message))
      )
      setAdminNoteDraft(updatedMessage.admin_note ?? '')

      if (payload.status === 'handled') {
        setSuccess('Message marqué comme traité.')
      } else if (payload.status === 'in_progress') {
        setSuccess('Message marqué comme en cours.')
      } else if (payload.status === 'new') {
        setSuccess('Message remis au statut nouveau.')
      } else {
        setSuccess('Note interne enregistrée.')
      }
    } catch (err: any) {
      setError(err.message || 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900">Messages utilisateurs</h1>
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
    <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages utilisateurs</h1>
          <p className="mt-1 text-sm text-gray-600">
            Consulter, suivre et traiter les demandes reçues.
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
            href="/admin/places"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Gérer les lieux
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

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            className={
              filter === item.value
                ? 'rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white'
                : 'rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50'
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-4 py-3 font-semibold text-gray-900">
            Liste des messages
          </div>

          {messages.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">
              Aucun message pour ce filtre.
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto">
              {messages.map((msg) => {
                const active = msg.id === selectedId

                return (
                  <button
                    key={msg.id}
                    type="button"
                    onClick={() => setSelectedId(msg.id)}
                    className={`w-full border-b border-gray-100 px-4 py-4 text-left transition ${
                      active ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-gray-900">{msg.subject}</div>
                        <div className="mt-1 truncate text-sm text-gray-600">
                          {getSender(msg)}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {new Date(msg.created_at).toLocaleString('fr-FR')}
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClass(
                          msg.status
                        )}`}
                      >
                        {formatStatusLabel(msg.status)}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          {!selectedMessage ? (
            <p className="text-sm text-gray-500">Sélectionne un message.</p>
          ) : (
            <>
              <div className="flex flex-col gap-3 border-b border-gray-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedMessage.subject}
                  </h2>
                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                    <div>
                      <strong>Expéditeur :</strong> {getSender(selectedMessage)}
                    </div>
                    <div>
                      <strong>Email :</strong> {selectedMessage.email}
                    </div>
                    <div>
                      <strong>Reçu le :</strong>{' '}
                      {new Date(selectedMessage.created_at).toLocaleString('fr-FR')}
                    </div>
                    {selectedMessage.handled_at ? (
                      <div>
                        <strong>Traité le :</strong>{' '}
                        {new Date(selectedMessage.handled_at).toLocaleString('fr-FR')}
                      </div>
                    ) : null}
                  </div>
                </div>

                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusBadgeClass(
                    selectedMessage.status
                  )}`}
                >
                  {formatStatusLabel(selectedMessage.status)}
                </span>
              </div>

              <div className="mt-5">
                <h3 className="text-sm font-semibold text-gray-900">Message</h3>
                <div className="mt-2 whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800">
                  {selectedMessage.message}
                </div>
              </div>

              <div className="mt-5">
                <label
                  htmlFor="admin-note"
                  className="block text-sm font-semibold text-gray-900"
                >
                  Note interne admin
                </label>
                <textarea
                  id="admin-note"
                  value={adminNoteDraft}
                  onChange={(e) => setAdminNoteDraft(e.target.value)}
                  rows={6}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                  placeholder="Ajouter une note interne..."
                />
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    updateMessage({
                      status: 'in_progress',
                      admin_note: adminNoteDraft,
                    })
                  }
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Marquer en cours
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    updateMessage({
                      status: 'handled',
                      admin_note: adminNoteDraft,
                    })
                  }
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
                >
                  Marquer traité
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    updateMessage({
                      status: 'new',
                      admin_note: adminNoteDraft,
                    })
                  }
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Remettre en nouveau
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    updateMessage({
                      admin_note: adminNoteDraft,
                    })
                  }
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Enregistrer la note
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  )
}