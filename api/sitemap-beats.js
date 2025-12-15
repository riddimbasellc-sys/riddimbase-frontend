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
    .from('beats')
    .select('id, created_at, updated_at, hidden')
    .order('created_at', { ascending: false })
    .limit(5000)

  if (error) {
    console.error('[sitemap-beats] Supabase error', error.message)
  }

  const rows = (data || []).filter((b) => !b.hidden)

  const urls = rows
    .map((b) => {
      const lastmod = b.updated_at || b.created_at
      return `
  <url>
    <loc>${baseUrl}/beat/${b.id}</loc>
    ${lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : ''}
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`
    })
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`

  createServerResponse(res, xml)
}

