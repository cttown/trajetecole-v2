const SITE_URL = 'https://www.trajetecole.fr';

export default function Sitemap() {
  return null;
}

export async function getServerSideProps({ res }) {
  const pages = [
    { url: '/', priority: '1.0', changefreq: 'weekly' },
    { url: '/qui-sommes-nous', priority: '0.7', changefreq: 'monthly' },
    { url: '/confidentialite', priority: '0.3', changefreq: 'yearly' },
    { url: '/contact-admin', priority: '0.3', changefreq: 'yearly' },
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