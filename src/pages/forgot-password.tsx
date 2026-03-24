import Head from 'next/head'
import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'
import styles from '../styles/FormPages.module.css'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/reset-password`
          : undefined

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      })

      if (error) {
        throw error
      }

      setSuccess(
        'Si cette adresse existe, un email de réinitialisation vient d’être envoyé.'
      )
      setEmail('')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erreur lors de l’envoi du lien de réinitialisation.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Mot de passe oublié - TrajetEcole</title>
        <meta
          name="description"
          content="Demandez un lien de réinitialisation de mot de passe pour votre compte TrajetEcole."
        />
      </Head>

      <main className={styles.page}>
        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.formLayout}>
              <div className={styles.sideCard}>
                <div className={styles.badge}>Accès au compte</div>
                <h1 className={styles.sideTitle}>Mot de passe oublié</h1>
                <p className={styles.sideText}>
                  Saisissez votre adresse email pour recevoir un lien de
                  réinitialisation si elle correspond à un compte TrajetEcole.
                </p>

                <div className={styles.infoList}>
                  <div className={styles.infoItem}>Lien envoyé par email</div>
                  <div className={styles.infoItem}>Réinitialisation sécurisée</div>
                  <div className={styles.infoItem}>Retour rapide à votre compte</div>
                </div>
              </div>

              <div className={styles.formCard}>
                <h2 className={styles.formTitle}>Recevoir un lien</h2>

                <form onSubmit={handleSubmit} className={styles.form}>
                  <div className={styles.field}>
                    <label htmlFor="email">Email</label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className={styles.buttonRow}>
                    <button type="submit" disabled={loading} className={styles.primaryButton}>
                      {loading ? 'Envoi...' : 'Envoyer le lien'}
                    </button>

                    <Link href="/login" className={styles.secondaryButton}>
                      Retour à la connexion
                    </Link>
                  </div>
                </form>

                {error ? <p className={styles.errorMessage}>{error}</p> : null}
                {success ? <p className={styles.successMessage}>{success}</p> : null}

                <p className={styles.helperBlock}>
                  Pensez à vérifier vos emails indésirables si vous ne voyez pas le message
                  arriver rapidement.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}