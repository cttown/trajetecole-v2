import type { CSSProperties } from 'react'
import Head from 'next/head'
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

const articleImageStyle: CSSProperties = {
  width: '100%',
  maxHeight: 460,
  objectFit: 'cover',
  borderRadius: 22,
  border: '1px solid #dbe8f5',
  boxShadow: '0 14px 34px rgba(24, 61, 109, 0.10)',
  marginBottom: 28,
}

const visualListStyle: CSSProperties = {
  display: 'grid',
  gap: 10,
  marginTop: 14,
}

const visualListItemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 10,
  padding: '12px 14px',
  borderRadius: 14,
  background: '#f7fbff',
  border: '1px solid #dbe8f5',
  color: '#3a5b83',
  fontSize: 18,
  lineHeight: 1.5,
}

const checkStyle: CSSProperties = {
  flex: '0 0 auto',
  color: '#1670dc',
  fontWeight: 800,
}

function VisualList({ items }: { items: string[] }) {
  return (
    <div style={visualListStyle}>
      {items.map((item) => (
        <div key={item} style={visualListItemStyle}>
          <span style={checkStyle}>✓</span>
          <span>{item}</span>
        </div>
      ))}
    </div>
  )
}

export default function GagnerTempsMatinEntraideParentsPage() {
  return (
    <>
      <Head>
        <title>
          Comment gagner du temps le matin grâce à l&apos;entraide entre parents ? - TrajetÉcole
        </title>
        <meta
          name="description"
          content="Conseils pratiques pour gagner du temps le matin grâce à l’entraide entre parents voisins et à l’organisation des trajets scolaires."
        />
      </Head>

      <main className={styles.page}>
        <section className={styles.legalSection}>
          <div className={styles.container}>
            <div className={styles.legalHeader}>
              <div className={styles.badge}>📚 Ressource pratique</div>

              <h1 className={styles.legalTitle}>
                Comment gagner du temps le matin grâce à l&apos;entraide entre parents ?
              </h1>

              <p className={styles.legalIntro}>
                Le matin, chaque minute compte. Entre le réveil des enfants, le petit-déjeuner et le
                trajet jusqu&apos;à l&apos;école, la course contre la montre est quotidienne.
              </p>

              <p className={styles.legalIntro} style={paragraphStyle}>
                Et si l&apos;entraide entre parents voisins permettait de souffler un peu ?
              </p>
            </div>

            <img
              src="/images/ressources/gagner-temps-matin-entraide-parents.jpg"
              alt="Enfants marchant vers l’école avec leurs cartables"
              style={articleImageStyle}
            />

            <div className={styles.legalCard}>
              <h2 style={titleStyle}>Le trajet scolaire, une contrainte quotidienne</h2>

              <p>
                Accompagner les enfants à l&apos;école à pied représente souvent 20 à 30 minutes
                aller-retour chaque matin, soit plus de deux heures par semaine.
              </p>

              <p style={paragraphStyle}>
                Ce temps, beaucoup de parents aimeraient le récupérer : pour partir plus sereinement
                au travail, ou simplement pour commencer la journée sans stress.
              </p>
            </div>

            <div className={styles.legalCard}>
              <h2 style={titleStyle}>Le principe du tour de rôle</h2>

              <p>
                La solution est simple : s&apos;organiser avec une ou deux familles voisines pour
                alterner les accompagnements à pied.
              </p>

              <p style={paragraphStyle}>Si trois familles participent :</p>

              <VisualList
                items={[
                  'chaque parent accompagne les enfants un matin sur trois ;',
                  'les deux autres matins, il est libre de partir directement au travail ;',
                  'sur une semaine de cinq jours, cela peut représenter plusieurs matins libérés par famille.',
                ]}
              />

              <p style={paragraphStyle}>
                C&apos;est un gain de temps réel, sans coût supplémentaire.
              </p>
            </div>

            <div className={styles.legalCard}>
              <h2 style={titleStyle}>Les conditions pour que ça fonctionne</h2>

              <p>Quelques éléments simples permettent d&apos;éviter les malentendus.</p>

              <VisualList
                items={[
                  'des horaires compatibles entre les familles ;',
                  'un itinéraire commun, avec des domiciles proches ;',
                  'un groupe WhatsApp ou SMS pour signaler les imprévus ;',
                  'un plan B défini en cas d’absence d’un parent.',
                ]}
              />
            </div>

            <div className={styles.legalCard}>
              <h2 style={titleStyle}>Comment trouver les bonnes familles ?</h2>

              <p>
                Le plus difficile est souvent de savoir quelles familles habitent près de chez vous
                et font le même trajet.
              </p>

              <VisualList
                items={[
                  'parlez-en à la sortie de l’école, car beaucoup de parents sont dans la même situation ;',
                  'utilisez les groupes Facebook ou WhatsApp de classe comme relais ;',
                  'utilisez TrajetÉcole pour trouver automatiquement des familles avec des trajets et horaires compatibles.',
                ]}
              />
            </div>

            <div className={styles.legalCard}>
              <h2 style={titleStyle}>Au-delà du gain de temps</h2>

              <p>
                Les enfants apprécient souvent de marcher ensemble. Le trajet devient un moment plus
                agréable, moins solitaire et plus rassurant.
              </p>

              <p style={paragraphStyle}>
                Pour les parents, ces petits arrangements peuvent aussi créer des liens utiles avec
                d&apos;autres familles du quartier.
              </p>
            </div>

            <div className={styles.legalCard}>
              <h2 style={titleStyle}>En résumé</h2>

              <p>
                L&apos;entraide entre parents permet de gagner du temps le matin, de réduire le
                stress et de rendre les trajets scolaires plus simples à gérer.
              </p>

              <p style={paragraphStyle}>
                Il suffit souvent de trouver une ou deux familles compatibles pour changer
                concrètement l&apos;organisation de la semaine.
              </p>
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