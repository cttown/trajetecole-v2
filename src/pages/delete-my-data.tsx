import Head from 'next/head'
import { FormEvent, useState } from 'react'
import Link from 'next/link'
import styles from '../styles/FormPages.module.css'

export default function DeleteMyDataPage() {
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const response = await fetch('/api/deletion/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, website }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || 'Erreur lors de la demande.')
      }

      setSuccess(
        payload?.message ||
          'Si cette adresse est connue, un email de confirmation va être envoyé.'
      )
      setEmail('')
      setWebsite('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la demande.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Supprimer mes données - TrajetEcole</title>
        <meta
          name="description"
          content="Demandez la suppression de vos données TrajetEcole."
        />
      </Head>

      <main className={styles.page}>
        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.formLayout}>
              <div className={styles.sideCard}>
                <div className={styles.badge}>Confidentialité</div>
                <h1 className={styles.sideTitle}>Supprimer mes données</h1>
                <p className={styles.sideText}>
                  Saisissez votre adresse email pour recevoir un lien de confirmation
                  si elle correspond à un compte TrajetEcole.
                </p>

                <div className={styles.infoList}>
                  <div className={styles.infoItem}>Demande sécurisée par email</div>
                  <div className={styles.infoItem}>Confirmation nécessaire</div>
                  <div className={styles.infoItem}>Processus clair et encadré</div>
                </div>
              </div>

              <div className={styles.formCard}>
                <h2 className={styles.formTitle}>Demander la suppression</h2>

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

                  <div className={styles.hiddenField}>
                    <label htmlFor="website">Website</label>
                    <input
                      id="website"
                      type="text"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </div>

                  <div className={styles.buttonRow}>
                    <button type="submit" disabled={loading} className={styles.primaryButton}>
                      {loading ? 'Envoi...' : 'Envoyer le lien de confirmation'}
                    </button>

                    <Link href="/" className={styles.secondaryButton}>
                      Retour à l’accueil
                    </Link>
                  </div>
                </form>

                {error ? <p className={styles.errorMessage}>{error}</p> : null}
                {success ? <p className={styles.successMessage}>{success}</p> : null}

                <p className={styles.helperBlock}>
                  Cette page permet uniquement de déclencher la procédure de suppression.
                  La confirmation finale se fait par email.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}