export async function GET() {
  const siteUrl = 'https://fieldledger.bridgewayapps.com';
  const pages = [
    '',
    '/hood-cleaning',
    '/fire-extinguisher',
    '/grease-trap',
    '/security',
    '/compliance',
    '/privacy',
    '/terms',
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((path) => `  <url>
    <loc>${siteUrl}${path}</loc>
    <changefreq>weekly</changefreq>
    <priority>${path === '' ? '1.0' : path.startsWith('/security') || path.startsWith('/compliance') ? '0.8' : '0.9'}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(sitemap, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
