import Head from 'next/head'
import { FormEvent, useMemo, useState } from 'react'
import Link from 'next/link'
import styles from '../styles/FormPages.module.css'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function validateEmail(value: string) {
  const trimmed = value.trim().toLowerCase()

  if (!trimmed) {
    return 'Ce champ est obligatoire.'
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return 'Format erroné.'
  }

  return ''
}

export default function DeleteMyDataPage() {
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [emailError, setEmailError] = useState('')

  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')

  const dirty = useMemo(
    () => email.trim() !== '' || website.trim() !== '',
    [email, website]
  )

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    const emailValidationMessage = validateEmail(email)
    setEmailError(emailValidationMessage)

    if (emailValidationMessage) {
      return
    }

    setLoading(true)

    try {
      const normalizedEmail = email.trim().toLowerCase()

      const response = await fetch('/api/deletion/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, website }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || 'Erreur lors de la demande.')
      }

      const successMessage =
        payload?.message ||
        'Si cette adresse est connue, un email de confirmation va être envoyé.'

      setSuccess(successMessage)
      setSubmittedEmail(normalizedEmail)
      setEmail('')
      setWebsite('')
      setEmailError('')
      setShowSuccessModal(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la demande.')
    } finally {
      setLoading(false)
    }
  }

  function handleBackHomeClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!dirty) {
      return
    }

    e.preventDefault()
    setShowLeaveModal(true)
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

                <form onSubmit={handleSubmit} className={styles.form} noValidate>
                  <div className={styles.field}>
                    <label htmlFor="email">Email</label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => setEmailError(validateEmail(email))}
                      required
                    />
                    {emailError ? (
                      <p className={styles.fieldError}>{emailError}</p>
                    ) : null}
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

                    <Link
                      href="/"
                      className={`${styles.secondaryButton} ${styles.backHomeButton}`}
                      onClick={handleBackHomeClick}
                    >
                      Retour à l’accueil
                    </Link>
                  </div>
                </form>

                {error ? <p className={styles.errorMessage}>{error}</p> : null}
                {success ? <p className={styles.successMessage}>{success}</p> : null}

                <p className={styles.helperBlock}>
                  Cette page permet uniquement de déclencher la procédure de suppression.
                  <span className={styles.noBreak}>
                    {' '}La confirmation finale se fait par email.
                  </span>
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {showSuccessModal ? (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalCard}>
            <h3 className={styles.modalTitle}>Lien envoyé</h3>
            <p className={styles.modalText}>
              Si l’adresse <strong>{submittedEmail}</strong> correspond à un compte
              TrajetEcole, un email de confirmation vient d’être envoyé.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => setShowSuccessModal(false)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showLeaveModal ? (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalCard}>
            <h3 className={styles.modalTitle}>Quitter cette page ?</h3>
            <p className={styles.modalText}>
              L’adresse email saisie sera perdue. Voulez-vous rester sur la page ou
              revenir à l’accueil ?
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setShowLeaveModal(false)}
              >
                Rester sur la page
              </button>
              <Link href="/" className={styles.primaryButton}>
                Retour à l’accueil
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}