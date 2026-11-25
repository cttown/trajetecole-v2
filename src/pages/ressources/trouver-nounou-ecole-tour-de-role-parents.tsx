import type { CSSProperties } from 'react'
import Seo from '../../components/Seo'
import Breadcrumb from '../../components/Breadcrumb'
import ShareButtons from '../../components/ShareButtons'
import { SITE_URL } from '../../lib/site'
import Link from 'next/link'
import styles from '../../styles/Home.module.css'

const titleStyle: CSSProperties = {
  fontSize: 28,
  lineHeight: 1.25,
  marginBottom: 14,
}

const paragraphStyle: CSSProperties = {
  marginTop: 12,
}

const listStyle: CSSProperties = {
  marginTop: 12,
}

const articleImageStyle: CSSProperties = {
  width: '100%',
  maxHeight: 460,
  objectFit: 'cover',
  borderRadius: 22,
  border: '1px solid #dbe8f5',
  boxShadow: '0 14px 34px rgba(24, 61, 109, 0.10)',
  marginBottom: 28,
}

export default function TrouverNounouEcoleTourDeRoleParentsPage() {
  return (
    <>
      <Seo
        title="Trouver une nounou pour emmener vos enfants à l’école : le tour de rôle entre parents - TrajetEcole"
        description="Pas de nounou pour accompagner vos enfants à l’école ? Découvrez comment vous relayer entre parents voisins, gratuitement et simplement."
        path="/ressources/trouver-nounou-ecole-tour-de-role-parents"
        type="article"
      />

      <main className={styles.page}>
        <section className={styles.legalSection}>
          <div className={styles.container}>
            <Breadcrumb
              items={[
                { label: 'Accueil', href: '/' },
                { label: 'Ressources', href: '/ressources' },
                { label: 'Nounou ou tour de rôle' },
              ]}
            />

            <div className={styles.legalHeader}>
              <div className={styles.badge}>📚 Ressource pratique</div>

              <h1 className={styles.legalTitle}>
                Trouver une nounou pour emmener vos enfants à l’école : et si le tour de rôle entre
                parents suffisait ?
              </h1>

              <p className={styles.legalIntro}>
                Vous travaillez tôt, vos horaires sont décalés, et vous cherchez à trouver une nounou
                pour emmener vos enfants à l’école ? C’est une solution courante, mais pas toujours
                nécessaire. Se relayer entre parents du quartier permet souvent de résoudre le
                problème sans payer de garde.
              </p>
            </div>

            <img
              src="/images/ressources/trouver-nounou-ecole-tour-de-role-parents.jpg"
              alt="Un parent accompagne plusieurs enfants à pied sur le trajet de l’école"
              style={articleImageStyle}
            />

            <div className={styles.legalCard}>
              <h2 style={titleStyle}>Pourquoi on pense d’abord à une nounou</h2>

              <p>
                Quand on ne peut pas accompagner ses enfants chaque jour, la nounou semble la réponse
                évidente : elle assure le trajet à pied, le matin comme à la sortie d’école. Mais
                elle représente un budget régulier, un contrat à gérer, et elle n’est pas toujours
                utile cinq jours sur cinq.
              </p>
            </div>

            <div className={styles.legalCard}>
              <h2 style={titleStyle}>Une alternative gratuite : le tour de rôle entre parents</h2>

              <p>
                Le principe est simple : deux ou trois familles voisines, dont les enfants vont à la
                même école, s’organisent pour accompagner les enfants à pied à tour de rôle.
              </p>

              <p style={paragraphStyle}>Avec trois familles :</p>

              <ul className={styles.legalList} style={listStyle}>
                <li>Chaque parent accompagne le groupe un jour sur trois</li>
                <li>Les autres jours, il part directement au travail</li>
              </ul>

              <p style={paragraphStyle}>Aucun coût, et un vrai gain de temps chaque semaine.</p>
            </div>

            <div className={styles.legalCard}>
              <h2 style={titleStyle}>Que faire quand on ne peut pas emmener ses enfants à l’école ?</h2>

              <p>
                Si vos contraintes sont ponctuelles, le tour de rôle suffit. Si elles sont
                quotidiennes, il se combine très bien avec d’autres solutions : un parent prend les
                matins, un autre les soirs, et vous gardez une aide extérieure uniquement pour les
                jours difficiles.
              </p>
            </div>

            <div className={styles.legalCard}>
              <h2 style={titleStyle}>Comment trouver des parents du quartier pour s’organiser ?</h2>

              <ul className={styles.legalList} style={listStyle}>
                <li>
                  Parlez-en à la sortie de l’école : beaucoup de parents ont le même besoin sans
                  l’avoir exprimé
                </li>
                <li>Utilisez les groupes WhatsApp ou Facebook de classe et de quartier</li>
                <li>
                  Essayez{' '}
                  <Link href="/" style={{ color: '#1670dc', fontWeight: 600 }}>
                    TrajetEcole
                  </Link>
                  , qui met en relation les familles ayant des trajets et des horaires compatibles,
                  avec contact uniquement si les deux familles sont d’accord
                </li>
              </ul>
            </div>

            <div className={styles.legalCard}>
              <h2 style={titleStyle}>Les règles à fixer dès le départ</h2>

              <ul className={styles.legalList} style={listStyle}>
                <li>Un point de rendez-vous et une heure de départ précise</li>
                <li>Un planning du tour de rôle, partagé dans un groupe WhatsApp</li>
                <li>Un plan B en cas d’absence d’un parent</li>
              </ul>
            </div>

            <div className={styles.legalCard}>
              <p>
                Avant de chercher une nounou, essayez l’entraide : c’est gratuit, flexible, et cela
                crée des liens durables dans le quartier.
              </p>
            </div>

            <div style={{ marginTop: 28, textAlign: 'center' }}>
              <p style={{ color: '#5c7699', marginBottom: 14, fontWeight: 600 }}>
                Cet article peut aider d’autres parents ? Partagez-le :
              </p>
              <ShareButtons
                url={`${SITE_URL}/ressources/trouver-nounou-ecole-tour-de-role-parents`}
                text="Trouver une nounou pour emmener vos enfants à l’école : le tour de rôle entre parents - TrajetEcole"
              />
            </div>

            <div className={styles.legalActions}>
              <Link href="/signup" className={styles.primaryButton}>
                Créer mon compte
              </Link>

              <Link href="/ressources" className={styles.secondaryButton}>
                Retour aux ressources
              </Link>

              <Link href="/" className={styles.secondaryButton}>
                Retour à l’accueil
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
