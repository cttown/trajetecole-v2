import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function DeleteMyDataConfirmPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    async function run() {
      const token =
        typeof router.query.token === 'string' ? router.query.token : ''

      if (!router.isReady) return

      if (!token) {
        setLoading(false)
        setError('Lien de confirmation invalide.')
        return
      }

      try {
        const response = await fetch('/api/deletion/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })

        const payload = await response.json().catch(() => null)

        if (!response.ok) {
          throw new Error(payload?.error || 'Erreur lors de la confirmation.')
        }

        setSuccess(
          payload?.message || 'Vos données ont bien été supprimées et archivées.'
        )
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Erreur lors de la confirmation.'
        )
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [router.isReady, router.query.token])

  return (
    <main
      style={{
        maxWidth: 760,
        margin: '40px auto',
        fontFamily: 'Arial, sans-serif',
        padding: '0 16px',
      }}
    >
      <h1>Confirmation de suppression</h1>

      {loading ? <p>Traitement en cours...</p> : null}
      {!loading && error ? <p style={{ color: '#b42318' }}>{error}</p> : null}
      {!loading && success ? <p style={{ color: '#027a48' }}>{success}</p> : null}

      <div style={{ marginTop: 20 }}>
        <Link href="/">Retour à l’accueil</Link>
      </div>
    </main>
  )
}