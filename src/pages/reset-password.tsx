import Head from 'next/head'
import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import styles from '../styles/FormPages.module.css'

export default function ResetPasswordPage() {
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function init() {
      setCheckingSession(true)
      setError('')
      setReady(false)

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (!isMounted) return

        if (event === 'PASSWORD_RECOVERY' || !!session) {
          setReady(true)
          setCheckingSession(false)
        }
      })

      try {
        const { data, error } = await supabase.auth.getSession()

        if (!isMounted) {
          subscription.unsubscribe()
          return
        }

        if (error) {
          setError(error.message)
          setCheckingSession(false)
          subscription.unsubscribe()
          return
        }

        if (data.session) {
          setReady(true)
          setCheckingSession(false)
          return
        }

        setTimeout(async () => {
          if (!isMounted) {
            subscription.unsubscribe()
            return
          }

          const { data: retryData } = await supabase.auth.getSession()

          if (!isMounted) {
            subscription.unsubscribe()
            return
          }

          if (retryData.session) {
            setReady(true)
          } else {
            setError(
              'Lien invalide ou expiré. Redemandez un nouvel email de réinitialisation.'
            )
          }

          setCheckingSession(false)
          subscription.unsubscribe()
        }, 2000)
      } catch (err) {
        if (!isMounted) {
          subscription.unsubscribe()
          return
        }

        setError(
          err instanceof Error
            ? err.message
            : 'Erreur lors de la vérification du lien.'
        )
        setCheckingSession(false)
        subscription.unsubscribe()
      }
    }

    init()

    return () => {
      isMounted = false
    }
  }, [router.isReady])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }

    if (password !== confirmPassword) {
      setError('Les deux mots de passe sont différents.')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) {
        throw error
      }

      setSuccess('Votre mot de passe a bien été mis à jour.')
      setPassword('')
      setConfirmPassword('')

      setTimeout(() => {
        router.push('/login')
      }, 1200)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erreur lors de la mise à jour du mot de passe.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Réinitialiser le mot de passe - TrajetEcole</title>
        <meta
          name="description"
          content="Réinitialisez votre mot de passe TrajetEcole."
        />
      </Head>

      <main className={styles.page}>
        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.formLayout}>
              <div className={styles.sideCard}>
                <div className={styles.badge}>Accès au compte</div>
                <h1 className={styles.sideTitle}>Réinitialiser mon mot de passe</h1>
                <p className={styles.sideText}>
                  Créez un nouveau mot de passe pour retrouver l’accès à votre compte
                  TrajetEcole.
                </p>

                <div className={styles.infoList}>
                  <div className={styles.infoItem}>Lien sécurisé de réinitialisation</div>
                  <div className={styles.infoItem}>Nouveau mot de passe personnel</div>
                  <div className={styles.infoItem}>Retour rapide vers la connexion</div>
                </div>
              </div>

              <div className={styles.formCard}>
                <h2 className={styles.formTitle}>Nouveau mot de passe</h2>

                {checkingSession ? (
                  <div className={styles.statusBox}>
                    <p className={styles.statusText}>Vérification du lien...</p>
                  </div>
                ) : null}

                {!checkingSession && error && !ready ? (
                  <>
                    <p className={styles.errorMessage}>{error}</p>
                    <div className={styles.secondaryActions}>
                      <Link href="/forgot-password" className={styles.secondaryButton}>
                        Demander un nouveau lien
                      </Link>
                    </div>
                  </>
                ) : null}

                {!checkingSession && ready ? (
                  <>
                    <form onSubmit={handleSubmit} className={styles.form}>
                      <div className={styles.field}>
                        <label htmlFor="password">Nouveau mot de passe</label>
                        <input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                        <p className={styles.helperText}>Minimum 6 caractères.</p>
                      </div>

                      <div className={styles.field}>
                        <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
                        <input
                          id="confirmPassword"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                        />
                      </div>

                      <div className={styles.buttonRow}>
                        <button
                          type="submit"
                          disabled={loading}
                          className={styles.primaryButton}
                        >
                          {loading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
                        </button>

                        <Link href="/login" className={styles.secondaryButton}>
                          Retour à la connexion
                        </Link>
                      </div>
                    </form>

                    {error ? <p className={styles.errorMessage}>{error}</p> : null}
                  </>
                ) : null}

                {success ? <p className={styles.successMessage}>{success}</p> : null}
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}