import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'

type AdminStats = {
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

function StatCard({
  label,
  value,
}: {
  label: string
  value: number | string
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  )
}

function formatSender(message: AdminStats['recentMessages'][number]) {
  const fullName = [message.parent_first_name, message.parent_last_name]
    .filter(Boolean)
    .join(' ')
    .trim()

  return fullName || message.email
}

export default function AdminHomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isForbidden, setIsForbidden] = useState(false)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function load() {
      try {
        setLoading(true)

        const {
          data: { session },
        } = await supabase.auth.getSession()

        console.log('ADMIN PAGE user id =', session?.user?.id)
        console.log('ADMIN PAGE email =', session?.user?.email)


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

        const response = await fetch('/api/admin/stats', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        const json = await response.json()

        if (!response.ok) {
          throw new Error(json.error || 'Erreur lors du chargement des statistiques.')
        }

        if (isMounted) {
          setStats(json)
          setError(null)
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
  }, [router])

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
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

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
          <p className="mt-1 text-sm text-gray-600">
            Vue d’ensemble des éléments à suivre et des actions en attente.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/places"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Gérer les lieux
          </Link>

            <Link
            href="/admin/stats"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
            Voir les statistiques
            </Link>


          <Link
            href="/admin/messages"
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Voir les messages
          </Link>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Utilisateurs" value={stats?.totalUsers ?? 0} />
        <StatCard label="Enfants" value={stats?.totalChildren ?? 0} />
        <StatCard label="Tous les trajets" value={stats?.totalTrips ?? 0} />
        <StatCard label="En recherche" value={stats?.searchingTrips ?? 0} />
        <StatCard label="Résolus" value={stats?.resolvedTrips ?? 0} />
        <StatCard label="En pause" value={stats?.pausedTrips ?? 0} />
        <StatCard label="Archivés" value={stats?.archivedTrips ?? 0} />
        <StatCard
          label="Lieux à valider"
          value={stats?.pendingPlaceSuggestions ?? 0}
        />
        <StatCard
          label="Messages non traités"
          value={stats?.unreadContactMessages ?? 0}
        />
      </section>

      <section className="mt-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Derniers messages reçus
          </h2>
          <Link
            href="/admin/messages"
            className="text-sm font-medium text-gray-700 hover:underline"
          >
            Voir tout
          </Link>
        </div>

        {stats?.recentMessages?.length ? (
          <div className="space-y-3">
            {stats.recentMessages.map((msg) => (
              <div
                key={msg.id}
                className="rounded-lg border border-gray-100 p-3"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="font-medium text-gray-900">
                      {msg.subject}
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatSender(msg)}
                    </div>
                  </div>

                  <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                    {msg.status}
                  </span>
                </div>

                <div className="mt-2 text-sm text-gray-500">
                  Reçu le {new Date(msg.created_at).toLocaleString('fr-FR')}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Aucun message récent.</p>
        )}
      </section>
    </main>
  )
}