import { createServerResponse } from './utils/sitemapResponse.js'

export default async function handler(req, res) {
  const baseUrl = process.env.SITE_URL || 'https://riddimbase.app'

  const staticPaths = [
    '/',
    '/home',
    '/beats',
    '/feed',
    '/services',
    '/producers',
    '/soundkits',
    '/producer/pro',
    '/producer/upload',
    '/jobs',
    '/pricing',
    '/about',
    '/faq',
    '/support',
    '/terms',
    '/privacy',
  ]

  const urls = staticPaths
    .map(
      (path) => `
  <url>
    <loc>${baseUrl}${path}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`,
    )
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`

  createServerResponse(res, xml)
}

