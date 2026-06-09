import Head from 'next/head'
import Link from 'next/link'
import styles from '../../styles/Home.module.css'

const titleStyle = {
  fontSize: 28,
  lineHeight: 1.25,
  marginBottom: 14,
}

const paragraphStyle = {
  marginTop: 12,
}

const articleImageStyle = {
  width: '100%',
  maxHeight: 420,
  objectFit: 'cover' as const,
  borderRadius: 22,
  border: '1px solid #dbe8f5',
  boxShadow: '0 14px 34px rgba(24, 61, 109, 0.10)',
  marginBottom: 28,
}

const visualListStyle = {
  display: 'grid',
  gap: 10,
  marginTop: 14,
}

const visualListItemStyle = {
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

const checkStyle = {
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

export default function OrganiserTrajetsScolairesEntreVoisinsPage() {
  return (
    <>
      <Head>
        <title>Comment organiser les trajets scolaires entre voisins ? - TrajetÉcole</title>
        <meta
          name="description"
          content="Conseils pratiques pour organiser les trajets scolaires entre voisins : départ groupé à pied, entraide entre parents, sécurité et organisation simple."
        />
      </Head>

      <main className={styles.page}>
        <section className={styles.legalSection}>
          <div className={styles.container}>
            <div className={styles.legalHeader}>
              <div className={styles.badge}>📚 Ressource pratique</div>

              <h1 className={styles.legalTitle}>
                Comment organiser les trajets scolaires entre voisins ?
              </h1>

              <p className={styles.legalIntro}>
                Chaque matin, de nombreux parents font le même chemin vers la même école, sans le
                savoir. Et si une simple mise en relation pouvait changer votre quotidien ?
              </p>
            </div>

            <img
              src="/images/ressources/trajets-scolaires-voisins.avif"
              alt="Parent accompagnant deux enfants avec des cartables"
              style={articleImageStyle}
            />

            <div className={styles.legalCard}>
              <h2 style={titleStyle}>Le problème du trajet solitaire</h2>

              <p>
                Accompagner ses enfants à l’école à pied, c’est rassurant, mais c’est aussi
                contraignant. Entre les horaires de travail, les activités du soir et les imprévus,
                beaucoup de familles se retrouvent seules à gérer ces allers-retours jour après
                jour.
              </p>

              <p style={paragraphStyle}>
                Pourtant, dans chaque quartier, des familles habitent à quelques rues les unes des
                autres, avec des enfants dans la même école, aux mêmes horaires.
              </p>
            </div>

            <div className={styles.legalCard}>
              <h2 style={titleStyle}>La solution : le départ groupé à pied</h2>

              <p>
                L’idée est simple : deux ou trois familles voisines s’organisent pour que leurs
                enfants fassent le trajet ensemble, accompagnés à tour de rôle par un parent.
              </p>

              <VisualList
                items={[
                  'Moins de trajets pour chaque parent : on n’accompagne plus tous les jours.',
                  'Plus de sécurité pour les enfants : ils ne marchent jamais seuls.',
                  'Un lien de confiance qui se crée naturellement entre familles du quartier.',
                ]}
              />
            </div>

            <div className={styles.legalCard}>
              <h2 style={titleStyle}>Comment trouver des familles compatibles ?</h2>

              <p>
                C’est souvent là que ça bloque. On ne connaît pas forcément ses voisins, et il est
                difficile de savoir qui fait quel trajet, à quelle heure.
              </p>

              <p style={paragraphStyle}>Voici quelques pistes concrètes.</p>
            </div>

            <div className={styles.stepsGrid}>
              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>1</div>
                <h3>L’affichage à l’école</h3>
                <p>
                  Proposez à l’école de mettre une feuille d’émargement dans l’entrée : les parents
                  intéressés laissent leur adresse et leurs horaires.
                </p>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>2</div>
                <h3>Les groupes de parents</h3>
                <p>
                  Les associations de parents d’élèves, les groupes WhatsApp de classe ou les pages
                  Facebook de quartier peuvent aider à trouver des familles proches.
                </p>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>3</div>
                <h3>Les outils en ligne</h3>
                <p>
                  Des sites comme TrajetÉcole permettent d’indiquer ses trajets et de trouver
                  d’autres parents compatibles, sans partager ses coordonnées trop tôt.
                </p>
              </div>
            </div>

            <div className={styles.legalCard} style={{ marginTop: 24 }}>
              <h2 style={titleStyle}>Comment s’organiser concrètement ?</h2>

              <p>Une fois les familles identifiées, quelques règles simples suffisent.</p>

              <VisualList
                items={[
                  'Définir un point de rendez-vous : devant une maison ou à un coin de rue.',
                  'Fixer les horaires : avec une petite marge pour les imprévus.',
                  'Établir un tour de rôle : qui accompagne quel jour.',
                  'Prévoir un plan B : en cas d’absence d’un parent.',
                ]}
              />

              <p style={paragraphStyle}>
                Un simple message WhatsApp suffit souvent pour coordonner l’organisation au
                quotidien.
              </p>
            </div>

            <div className={styles.legalCard}>
              <h2 style={titleStyle}>Et pour les activités extrascolaires ?</h2>

              <p>
                La même logique s’applique aux trajets vers le sport, la musique, le conservatoire
                ou les autres activités. Les horaires sont souvent fixes, les trajets réguliers :
                c’est même parfois plus simple à organiser qu’à l’école.
              </p>
            </div>

            <div className={styles.legalCard}>
              <h2 style={titleStyle}>En résumé</h2>

              <p>
                Organiser des trajets groupés à pied entre voisins ne demande pas beaucoup
                d’efforts, mais peut transformer le quotidien de plusieurs familles. Il suffit de
                trouver les bons voisins, puis de faire le premier pas.
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