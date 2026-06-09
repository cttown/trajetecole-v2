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

export default function ActivitesExtrascolairesPartagerTrajetsPage() {
  return (
    <>
      <Head>
        <title>
          Activités extrascolaires : comment partager les trajets avec d&apos;autres familles ? -
          TrajetÉcole
        </title>
        <meta
          name="description"
          content="Conseils pratiques pour partager les trajets vers les activités extrascolaires : sport, musique, danse, arts martiaux et entraide entre familles."
        />
      </Head>

      <main className={styles.page}>
        <section className={styles.legalSection}>
          <div className={styles.container}>
            <div className={styles.legalHeader}>
              <div className={styles.badge}>📚 Ressource pratique</div>

              <h1 className={styles.legalTitle}>
                Activités extrascolaires : comment partager les trajets avec d&apos;autres familles ?
              </h1>

              <p className={styles.legalIntro}>
                Sport, musique, danse, arts martiaux... Les activités extrascolaires rythment la
                semaine de nombreux enfants.
              </p>

              <p className={styles.legalIntro} style={paragraphStyle}>
                Mais enchaîner les trajets après une journée de travail peut vite devenir
                épuisant. La bonne nouvelle : ce sont souvent les mêmes familles qui font les mêmes
                trajets, semaine après semaine.
              </p>
            </div>

            <img
              src="/images/ressources/activites-extrascolaires-partager-trajets.jpg"
              alt="Enfants participant à une activité sportive en extérieur"
              style={articleImageStyle}
            />

            <div className={styles.legalCard}>
              <h2 style={titleStyle}>Des trajets réguliers, une opportunité à saisir</h2>

              <p>
                Contrairement aux trajets scolaires, les activités extrascolaires ont un avantage de
                taille : les horaires sont fixes et récurrents.
              </p>

              <p style={paragraphStyle}>
                Cette régularité facilite grandement l&apos;organisation entre familles. Il suffit
                de trouver une ou deux familles qui fréquentent la même activité, aux mêmes
                horaires. Une fois en place, cela peut fonctionner toute l&apos;année sans effort.
              </p>
            </div>

            <div className={styles.legalCard}>
              <h2 style={titleStyle}>Comment trouver les familles compatibles ?</h2>

              <VisualList
                items={[
                  'parlez aux autres parents à l’entrée du club ou de l’école de musique : beaucoup sont dans la même situation sans l’avoir jamais évoqué ;',
                  'utilisez les groupes WhatsApp ou Facebook de l’activité pour lancer l’idée ;',
                  'utilisez TrajetÉcole pour trouver des familles compatibles pour l’école, mais aussi pour les activités extrascolaires.',
                ]}
              />
            </div>

            <div className={styles.legalCard}>
              <h2 style={titleStyle}>S&apos;organiser simplement</h2>

              <p>
                Une fois les familles identifiées, il n&apos;est pas nécessaire de mettre en place
                une organisation compliquée.
              </p>

              <VisualList
                items={[
                  'un tour de rôle : une famille accompagne à l’aller, l’autre récupère au retour ;',
                  'un groupe WhatsApp dédié pour signaler les absences ou les changements ;',
                  'un itinéraire à pied défini, connu de tous les enfants.',
                ]}
              />
            </div>

            <div className={styles.legalCard}>
              <h2 style={titleStyle}>Les bénéfices au quotidien</h2>

              <p>
                Pour les parents, le gain est immédiat : un trajet sur deux peut être supprimé.
              </p>

              <p style={paragraphStyle}>
                Pour les enfants, marcher ensemble vers leur activité favorite renforce les liens
                d&apos;amitié. C&apos;est aussi une façon naturelle de les encourager vers plus
                d&apos;autonomie, dans un cadre sécurisé.
              </p>
            </div>

            <div className={styles.legalCard}>
              <h2 style={titleStyle}>Une entraide qui peut s&apos;élargir</h2>

              <p>
                Les familles qui s&apos;organisent pour une activité finissent souvent par étendre
                la démarche à d&apos;autres trajets : l&apos;école, le mercredi après-midi ou
                d&apos;autres activités régulières.
              </p>

              <p style={paragraphStyle}>
                Une fois la confiance installée, l&apos;entraide devient un réflexe.
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