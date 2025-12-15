import { createClient } from '@supabase/supabase-js'
import { createServerResponse } from './utils/sitemapResponse.js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

export default async function handler(req, res) {
  const baseUrl = process.env.SITE_URL || 'https://riddimbase.app'

  if (!supabase) {
    createServerResponse(
      res,
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
    )
    return
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, updated_at')
    .order('updated_at', { ascending: false })
    .limit(5000)

  if (error) {
    console.error('[sitemap-producers] Supabase error', error.message)
  }

  const rows = data || []

  const urls = rows
    .map((p) => {
      const lastmod = p.updated_at
      return `
  <url>
    <loc>${baseUrl}/producer/${p.id}</loc>
    ${lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : ''}
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
    })
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`

  createServerResponse(res, xml)
}

