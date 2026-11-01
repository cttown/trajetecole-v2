import Head from 'next/head'
import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import styles from '../styles/FormPages.module.css'
import type { SetGlobalPopup } from './_app'

type Props = {
  setGlobalPopup?: SetGlobalPopup
}

function validatePassword(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return 'Le mot de passe est obligatoire.'
  }

  if (trimmed.length < 6) {
    return 'Minimum 6 caractères.'
  }

  return ''
}

export default function ResetPasswordPage({ setGlobalPopup }: Props) {
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'checking' | 'valid' | 'invalid'>(
    'checking'
  )
  const [error, setError] = useState('')

  function showPopup(message: string, type: 'success' | 'error') {
    if (setGlobalPopup) {
      setGlobalPopup({ message, type })
      return
    }
    if (type === 'error') setError(message)
  }

  useEffect(() => {
    // On n'affiche le formulaire que si une vraie session de récupération
    // est présente. Le client Supabase traite le lien reçu par email de
    // façon asynchrone : on écoute donc l'événement PASSWORD_RECOVERY,
    // on vérifie aussi la session déjà établie, et on bascule en "invalid"
    // si rien n'est détecté dans un court délai (lien absent/expiré).
    let settled = false

    const markValid = () => {
      settled = true
      setStatus('valid')
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        markValid()
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) markValid()
    })

    const timer = setTimeout(() => {
      if (!settled) setStatus('invalid')
    }, 2500)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    const message = validatePassword(password)
    setPasswordError(message)

    if (message) return

    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password: password.trim(),
    })

    setLoading(false)

    if (error) {
      showPopup(error.message, 'error')
      return
    }

    // On ferme la session de récupération pour que l'utilisateur se
    // reconnecte proprement avec son nouveau mot de passe.
    await supabase.auth.signOut()

    showPopup('Votre mot de passe a bien été mis à jour.', 'success')
    router.push('/login')
  }

  return (
    <>
      <Head>
        <title>Réinitialiser mon mot de passe - TrajetEcole</title>
      </Head>

      <main className={styles.page}>
        <section className={styles.section}>
          <div className={styles.container} style={{ maxWidth: 760 }}>
            <div className={styles.formCard}>
              <h1 className={styles.formTitle}>Réinitialiser mon mot de passe</h1>

              {status === 'checking' ? (
                <p className={styles.statusMessage}>Vérification du lien...</p>
              ) : status === 'invalid' ? (
                <p className={styles.errorMessage}>
                  Ce lien de réinitialisation est invalide ou a expiré. Merci
                  d’en demander un nouveau depuis la page « Mot de passe
                  oublié ».
                </p>
              ) : (
                <form onSubmit={handleSubmit} className={styles.form}>
                  <div className={styles.field}>
                    <label htmlFor="password">Nouveau mot de passe</label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => setPasswordError(validatePassword(password))}
                      required
                    />
                    {passwordError ? (
                      <p className={styles.fieldError}>{passwordError}</p>
                    ) : null}
                  </div>

                  <button type="submit" disabled={loading} className={styles.primaryButton}>
                    {loading ? 'Mise à jour...' : 'Enregistrer le nouveau mot de passe'}
                  </button>

                  {error ? <p className={styles.errorMessage}>{error}</p> : null}
                </form>
              )}

              <div className={styles.secondaryActions}>
                {status === 'invalid' ? (
                  <Link href="/forgot-password" className={styles.secondaryButton}>
                    Demander un nouveau lien
                  </Link>
                ) : null}

                <Link href="/login" className={styles.secondaryButton}>
                  Retour à la connexion
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}