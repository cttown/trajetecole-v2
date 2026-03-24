import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'

type DailyPoint = {
  day: string
  value: number
}

type PageCount = {
  page: string
  views: number
}

type StatsDetails = {
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

function SimpleBarChart({
  title,
  data,
}: {
  title: string
  data: DailyPoint[]
}) {
  const max = Math.max(...data.map((d) => d.value), 1)

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>

      {data.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">Aucune donnée disponible.</p>
      ) : (
        <>
          <div className="mt-4">
            <div className="flex h-56 items-end gap-1 overflow-hidden">
              {data.map((item) => {
                const height = `${Math.max((item.value / max) * 100, item.value > 0 ? 4 : 0)}%`

                return (
                  <div
                    key={item.day}
                    className="flex min-w-0 flex-1 flex-col items-center justify-end"
                    title={`${item.day}: ${item.value}`}
                  >
                    <div
                      className="w-full rounded-t bg-gray-800"
                      style={{ height }}
                    />
                  </div>
                )
              })}
            </div>

            <div className="mt-3 flex justify-between text-xs text-gray-500">
              <span>{data[0]?.day ?? ''}</span>
              <span>{data[data.length - 1]?.day ?? ''}</span>
            </div>
          </div>
        </>
      )}
    </section>
  )
}

export default function AdminStatsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isForbidden, setIsForbidden] = useState(false)
  const [error, setError] = useState('')
  const [stats, setStats] = useState<StatsDetails | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadPage() {
      try {
        setLoading(true)
        setError('')

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

        const response = await fetch('/api/admin/stats-details', {
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

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900">Statistiques</h1>
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
          <h1 className="text-2xl font-bold text-gray-900">Statistiques</h1>
          <p className="mt-1 text-sm text-gray-600">
            Vue d’ensemble de l’activité du site et de son évolution récente.
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

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Vues totales du site" value={stats?.totals.totalPageViews ?? 0} />
        <StatCard label="Trajets créés" value={stats?.totals.totalTripCreatedEvents ?? 0} />
        <StatCard
          label="Demandes de mise en relation"
          value={stats?.totals.totalMatchRequestEvents ?? 0}
        />
        <StatCard
          label="Messages envoyés à l’admin"
          value={stats?.totals.totalContactAdminEvents ?? 0}
        />
        <StatCard label="Inscriptions" value={stats?.totals.totalSignupEvents ?? 0} />
      </section>

      <section className="mt-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Pages les plus vues</h2>

        {stats?.topPages?.length ? (
          <div className="mt-4 space-y-3">
            {stats.topPages.map((item) => (
              <div
                key={item.page}
                className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
              >
                <span className="text-sm font-medium text-gray-800">{item.page}</span>
                <span className="text-sm text-gray-600">{item.views} vues</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-500">Aucune donnée disponible.</p>
        )}
      </section>

      <div className="mt-8 grid grid-cols-1 gap-6">
        <SimpleBarChart
          title="Vues du site par jour — 30 derniers jours"
          data={stats?.pageViewsLast30Days ?? []}
        />

        <SimpleBarChart
          title="Créations de trajets par jour — 30 derniers jours"
          data={stats?.tripsCreatedLast30Days ?? []}
        />
      </div>
    </main>
  )
}