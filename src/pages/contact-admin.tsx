import Head from 'next/head'
import { FormEvent, useMemo, useState } from 'react'
import Link from 'next/link'
import styles from '../styles/FormPages.module.css'

const NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[ '\-][A-Za-zÀ-ÖØ-öø-ÿ]+)*$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const MESSAGE_MAX_LENGTH = 2000

function validateName(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return 'Ce champ est obligatoire.'
  }

  if (!NAME_REGEX.test(trimmed)) {
    return 'Utilisez uniquement des lettres.'
  }

  return ''
}

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

function validateSubject(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return 'Ce champ est obligatoire.'
  }

  if (trimmed.length > 200) {
    return 'Le sujet est trop long.'
  }

  return ''
}

function validateMessage(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return 'Ce champ est obligatoire.'
  }

  if (trimmed.length < 10) {
    return 'Le message est trop court.'
  }

  if (trimmed.length > MESSAGE_MAX_LENGTH) {
    return `Maximum ${MESSAGE_MAX_LENGTH} caractères.`
  }

  return ''
}

export default function ContactAdminPage() {
  const [parentFirstName, setParentFirstName] = useState('')
  const [parentLastName, setParentLastName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('')

  const [parentFirstNameError, setParentFirstNameError] = useState('')
  const [parentLastNameError, setParentLastNameError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [subjectError, setSubjectError] = useState('')
  const [messageError, setMessageError] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)

  const dirty = useMemo(
    () =>
      [
        parentFirstName,
        parentLastName,
        email,
        subject,
        message,
        website,
      ].some((value) => value.trim() !== ''),
    [parentFirstName, parentLastName, email, subject, message, website]
  )

  function resetForm() {
    setParentFirstName('')
    setParentLastName('')
    setEmail('')
    setSubject('')
    setMessage('')
    setWebsite('')

    setParentFirstNameError('')
    setParentLastNameError('')
    setEmailError('')
    setSubjectError('')
    setMessageError('')
  }

  function validateForm() {
    const firstNameMessage = validateName(parentFirstName)
    const lastNameMessage = validateName(parentLastName)
    const emailMessage = validateEmail(email)
    const subjectMessage = validateSubject(subject)
    const messageMessage = validateMessage(message)

    setParentFirstNameError(firstNameMessage)
    setParentLastNameError(lastNameMessage)
    setEmailError(emailMessage)
    setSubjectError(subjectMessage)
    setMessageError(messageMessage)

    return (
      !firstNameMessage &&
      !lastNameMessage &&
      !emailMessage &&
      !subjectMessage &&
      !messageMessage
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/contact-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parent_first_name: parentFirstName.trim(),
          parent_last_name: parentLastName.trim(),
          email: email.trim().toLowerCase(),
          subject: subject.trim(),
          message: message.trim(),
          website,
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || 'Erreur lors de l’envoi du message.')
      }

      const successMessage =
        'Votre message a bien été envoyé. Un email de confirmation vient de vous être adressé.'
      setSuccess(successMessage)
      resetForm()
      setShowSuccessModal(true)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erreur lors de l’envoi du message.'
      )
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

                <form onSubmit={handleSubmit} className={styles.form} noValidate>
                  <div className={styles.fieldRow}>
                    <div className={styles.field}>
                      <label htmlFor="parentFirstName">Prénom</label>
                      <input
                        id="parentFirstName"
                        type="text"
                        value={parentFirstName}
                        onChange={(e) => setParentFirstName(e.target.value)}
                        onBlur={() =>
                          setParentFirstNameError(validateName(parentFirstName))
                        }
                        required
                      />
                      {parentFirstNameError ? (
                        <p className={styles.fieldError}>{parentFirstNameError}</p>
                      ) : null}
                    </div>

                    <div className={styles.field}>
                      <label htmlFor="parentLastName">Nom</label>
                      <input
                        id="parentLastName"
                        type="text"
                        value={parentLastName}
                        onChange={(e) => setParentLastName(e.target.value)}
                        onBlur={() => setParentLastNameError(validateName(parentLastName))}
                        required
                      />
                      {parentLastNameError ? (
                        <p className={styles.fieldError}>{parentLastNameError}</p>
                      ) : null}
                    </div>
                  </div>

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
                    {emailError ? <p className={styles.fieldError}>{emailError}</p> : null}
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="subject">Sujet</label>
                    <input
                      id="subject"
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      onBlur={() => setSubjectError(validateSubject(subject))}
                      required
                      maxLength={200}
                    />
                    {subjectError ? (
                      <p className={styles.fieldError}>{subjectError}</p>
                    ) : null}
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="message">Message</label>
                    <textarea
                      id="message"
                      rows={8}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onBlur={() => setMessageError(validateMessage(message))}
                      required
                      maxLength={MESSAGE_MAX_LENGTH}
                    />
                    <p className={styles.helperText}>
                      {message.length}/{MESSAGE_MAX_LENGTH} caractères
                    </p>
                    {messageError ? (
                      <p className={styles.fieldError}>{messageError}</p>
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
                      {loading ? 'Envoi...' : 'Envoyer le message'}
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
              </div>
            </div>
          </div>
        </section>
      </main>

      {showSuccessModal ? (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalCard}>
            <h3 className={styles.modalTitle}>Message envoyé</h3>
            <p className={styles.modalText}>
              Votre message a bien été transmis à l’administrateur. Un email de
              confirmation vient de vous être envoyé.
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
              Les informations saisies seront perdues. Voulez-vous rester sur la
              page ou revenir à l’accueil ?
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