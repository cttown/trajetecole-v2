import Head from 'next/head'
import { FormEvent, useState } from 'react'
import Link from 'next/link'
import styles from '../styles/FormPages.module.css'

export default function ContactAdminPage() {
  const [parentFirstName, setParentFirstName] = useState('')
  const [parentLastName, setParentLastName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
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
      const response = await fetch('/api/contact-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parent_first_name: parentFirstName,
          parent_last_name: parentLastName,
          email,
          subject,
          message,
          website,
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || 'Erreur lors de l’envoi du message.')
      }

      setSuccess(
        'Votre message a bien été envoyé. Un email de confirmation vient de vous être adressé.'
      )
      setParentFirstName('')
      setParentLastName('')
      setEmail('')
      setSubject('')
      setMessage('')
      setWebsite('')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erreur lors de l’envoi du message.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Contacter l’administrateur - TrajetEcole</title>
        <meta
          name="description"
          content="Contactez l’administrateur de TrajetEcole pour poser une question ou signaler un problème."
        />
      </Head>

      <main className={styles.page}>
        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.formLayout}>
              <div className={styles.sideCard}>
                <div className={styles.badge}>Support TrajetEcole</div>
                <h1 className={styles.sideTitle}>Contacter l’administrateur</h1>
                <p className={styles.sideText}>
                  Utilisez ce formulaire pour poser une question, signaler un problème
                  ou demander de l’aide concernant la plateforme.
                </p>

                <div className={styles.infoList}>
                  <div className={styles.infoItem}>Question sur le fonctionnement</div>
                  <div className={styles.infoItem}>Signalement d’un bug ou d’un souci</div>
                  <div className={styles.infoItem}>Réponse par email de confirmation</div>
                </div>
              </div>

              <div className={styles.formCard}>
                <h2 className={styles.formTitle}>Envoyer un message</h2>

                <form onSubmit={handleSubmit} className={styles.form}>
                  <div className={styles.fieldRow}>
                    <div className={styles.field}>
                      <label htmlFor="parentFirstName">Prénom</label>
                      <input
                        id="parentFirstName"
                        type="text"
                        value={parentFirstName}
                        onChange={(e) => setParentFirstName(e.target.value)}
                      />
                    </div>

                    <div className={styles.field}>
                      <label htmlFor="parentLastName">Nom</label>
                      <input
                        id="parentLastName"
                        type="text"
                        value={parentLastName}
                        onChange={(e) => setParentLastName(e.target.value)}
                      />
                    </div>
                  </div>

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

                  <div className={styles.field}>
                    <label htmlFor="subject">Sujet</label>
                    <input
                      id="subject"
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="message">Message</label>
                    <textarea
                      id="message"
                      rows={8}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
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
                      {loading ? 'Envoi...' : 'Envoyer le message'}
                    </button>

                    <Link href="/" className={styles.secondaryButton}>
                      Retour à l’accueil
                    </Link>
                  </div>
                </form>

                {error ? <p className={styles.errorMessage}>{error}</p> : null}
                {success ? <p className={styles.successMessage}>{success}</p> : null}
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}