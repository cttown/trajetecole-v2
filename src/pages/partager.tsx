import Seo from '../components/Seo'
import Breadcrumb from '../components/Breadcrumb'
import ShareButtons from '../components/ShareButtons'
import Link from 'next/link'
import styles from '../styles/Home.module.css'

export default function PartagerPage() {
  return (
    <>
      <Seo
        title="Partager TrajetEcole"
        description="Aidez d’autres familles à découvrir TrajetEcole : partagez le site en un clic sur vos réseaux."
        path="/partager"
      />

      <main className={styles.page}>
        <section className={styles.legalSection}>
          <div className={styles.container}>
            <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Partager' }]} />

            <div className={styles.legalHeader}>
              <div className={styles.badge}>🤝 Entraide entre parents</div>
              <h1 className={styles.legalTitle}>Faites connaître TrajetEcole</h1>
            </div>

            <div className={styles.legalCard}>
              <p>
                Plus il y a de familles inscrites près de chez vous, plus les correspondances de
                trajets sont nombreuses. En partageant le site autour de vous — à la sortie de
                l’école, dans les groupes de parents ou sur vos réseaux — vous aidez d’autres
                familles à s’organiser plus facilement.
              </p>

              <p style={{ marginTop: 16, fontWeight: 600 }}>Choisissez comment partager :</p>

              <div style={{ marginTop: 20 }}>
                <ShareButtons />
              </div>

              <p style={{ marginTop: 20, fontSize: 14, color: '#5c7699', textAlign: 'center' }}>
                Sur téléphone, le bouton « Partager » ouvre directement le menu de votre appareil
                (Facebook, WhatsApp, Messages…).
              </p>
            </div>

            <div className={styles.legalActions}>
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
