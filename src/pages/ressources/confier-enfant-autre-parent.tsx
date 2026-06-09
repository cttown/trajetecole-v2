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

export default function ConfierEnfantAutreParentPage() {
  return (
    <>
      <Head>
        <title>
          Confier son enfant à un autre parent : comment s&apos;organiser sereinement ? -
          TrajetÉcole
        </title>
        <meta
          name="description"
          content="Conseils pratiques pour organiser sereinement un trajet partagé avec un autre parent : confiance, règles, horaires, imprévus et mise en relation."
        />
      </Head>

      <main className={styles.page}>
        <section className={styles.legalSection}>
          <div className={styles.container}>
            <div className={styles.legalHeader}>
              <div className={styles.badge}>📚 Ressource pratique</div>

              <h1 className={styles.legalTitle}>
                Confier son enfant à un autre parent : comment s&apos;organiser sereinement ?
              </h1>

              <p className={styles.legalIntro}>
                Laisser son enfant partir à l&apos;école avec un autre parent, même un voisin de
                confiance, n&apos;est pas toujours une décision facile.
              </p>

              <p className={styles.legalIntro} style={paragraphStyle}>
                C&apos;est normal. Voici comment mettre en place une organisation rassurante pour
                toute la famille.
              </p>
            </div>

            <div className={styles.legalCard}>
              <h2 style={titleStyle}>Une question de confiance</h2>

              <p>
                La confiance ne se décrète pas, elle se construit. Avant de se lancer, quelques
                étapes simples permettent de démarrer du bon pied.
              </p>

              <VisualList
                items={[
                  'une première rencontre informelle : un café, une discussion à la sortie de l’école ;',
                  'un trajet test ensemble : la première fois, accompagnez le groupe pour observer comment cela se passe ;',
                  'des échanges réguliers : un groupe WhatsApp permet de rester en contact facilement.',
                ]}
              />
            </div>

            <div className={styles.legalCard}>
              <h2 style={titleStyle}>Ce qu&apos;il faut définir dès le départ</h2>

              <p>
                Pour éviter les malentendus, mieux vaut clarifier quelques points essentiels avant
                de commencer.
              </p>

              <VisualList
                items={[
                  'l’itinéraire exact : quel chemin, quels passages piétons, quelles règles de sécurité ;',
                  'les horaires précis : heure de départ et heure d’arrivée attendue ;',
                  'le comportement en cas d’imprévu : retard, enfant malade, absence d’un parent ;',
                  'les règles communes : comportement dans la rue, gestion des conflits entre enfants.',
                ]}
              />
            </div>

            <div className={styles.legalCard}>
              <h2 style={titleStyle}>Rassurer les enfants aussi</h2>

              <p>
                Le changement d&apos;habitude demande parfois un temps d&apos;adaptation, surtout
                pour les plus jeunes.
              </p>

              <VisualList
                items={[
                  'expliquez-leur qui sont les autres familles et pourquoi vous vous organisez ainsi ;',
                  'faites un trajet ensemble la première fois pour qu’ils se sentent à l’aise ;',
                  'valorisez l’expérience : marcher avec des amis est souvent plus agréable que marcher seul.',
                ]}
              />
            </div>

            <div className={styles.legalCard}>
              <h2 style={titleStyle}>Un cadre simple</h2>

              <p>
                Pour un trajet à pied entre familles, l&apos;organisation repose d&apos;abord sur
                une entente claire entre parents.
              </p>

              <p style={paragraphStyle}>
                L&apos;important est que chacun comprenne bien le fonctionnement : qui accompagne,
                quand, par quel itinéraire et comment prévenir en cas d&apos;imprévu.
              </p>
            </div>

            <div className={styles.legalCard}>
              <h2 style={titleStyle}>Trouver les bonnes familles</h2>

              <p>
                Des plateformes comme TrajetÉcole mettent en relation des familles du même quartier
                avec des trajets compatibles.
              </p>

              <p style={paragraphStyle}>
                Le contact ne se fait qu&apos;avec l&apos;accord mutuel des deux familles, ce qui
                permet de commencer l&apos;échange dans un cadre plus rassurant.
              </p>
            </div>

            <div className={styles.legalCard}>
              <h2 style={titleStyle}>En résumé</h2>

              <p>
                Confier ponctuellement le trajet de son enfant à un autre parent peut devenir une
                organisation simple et rassurante si les règles sont claires dès le départ.
              </p>

              <p style={paragraphStyle}>
                La confiance se construit progressivement, avec des échanges réguliers, un cadre
                partagé et une organisation adaptée aux enfants.
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