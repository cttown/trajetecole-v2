import { SITE_URL } from '../lib/site';

export default function Sitemap() {
  return null;
}

export async function getServerSideProps({ res }) {
  const pages = [
    { url: '/', priority: '1.0', changefreq: 'weekly' },
    { url: '/qui-sommes-nous', priority: '0.7', changefreq: 'monthly' },
    { url: '/confidentialite', priority: '0.3', changefreq: 'yearly' },
    { url: '/contact-admin', priority: '0.3', changefreq: 'yearly' },
    { url: '/ressources', priority: '0.6', changefreq: 'monthly' },
    { url: '/ressources/raisons-partager-trajets-enfants-pied', priority: '0.5', changefreq: 'monthly' },
    { url: '/ressources/organiser-trajets-scolaires-entre-voisins', priority: '0.5', changefreq: 'monthly' },
    { url: '/ressources/activites-extrascolaires-partager-trajets', priority: '0.5', changefreq: 'monthly' },
    { url: '/ressources/gagner-temps-matin-entraide-parents', priority: '0.5', changefreq: 'monthly' },
    { url: '/ressources/regles-trajets-partages-familles', priority: '0.5', changefreq: 'monthly' },
    { url: '/ressources/confier-enfant-autre-parent', priority: '0.5', changefreq: 'monthly' },
    { url: '/ressources/trouver-nounou-ecole-tour-de-role-parents', priority: '0.5', changefreq: 'monthly' },
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(({ url, priority, changefreq }) => `  <url>
    <loc>${SITE_URL}${url}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'text/xml');
  res.write(sitemap);
  res.end();

  return { props: {} };
}