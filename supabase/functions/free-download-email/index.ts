// Supabase Edge Function: free-download-email
// Deploy with: supabase functions deploy free-download-email
// Invoke with: POST /functions/v1/free-download-email
// JSON: { beatTitle, downloadUrl, buyerEmail }

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'RiddimBase <support@riddimbase.app>'

const ALLOWED_ORIGINS = new Set([
  'https://www.riddimbase.app',
  'https://riddimbase.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
])

function corsHeaders(origin: string | null) {
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : '*'
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    Vary: 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
  }
}

async function sendResendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY missing; skipping real send.')
    return { id: 'skipped', skipped: true }
  }

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    }),
  })

  const data = await resp.json().catch(() => null)
  if (!resp.ok) {
    console.error('Resend error', data)
    throw new Error('Failed to send via Resend')
  }
  return data
}

serve(async (req: Request) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders(origin) })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders(origin) })
  }

  try {
    const body: any = await req.json().catch(() => ({}))
    const beatTitle = String(body?.beatTitle || '').trim()
    const downloadUrl = String(body?.downloadUrl || '').trim()
    const buyerEmail = String(body?.buyerEmail || '').trim()

    if (!buyerEmail || !downloadUrl) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing buyerEmail or downloadUrl' }), {
        status: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      })
    }

    const safeTitle = beatTitle || 'your beat'
    const subject = `Your free download: ${safeTitle}`
    const escapedTitle = safeTitle.replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    const html = `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; line-height: 1.5;">
        <h2 style="margin: 0 0 12px;">Here’s your download</h2>
        <p style="margin: 0 0 12px;">Thanks for downloading <strong>${escapedTitle}</strong> on RiddimBase.</p>
        <p style="margin: 0 0 16px;">
          <a href="${downloadUrl}" style="display: inline-block; padding: 10px 14px; background: #10b981; color: #0b1220; text-decoration: none; border-radius: 999px; font-weight: 700;">Download</a>
        </p>
        <p style="margin: 0 0 12px; font-size: 12px; color: #64748b;">If the button doesn’t work, copy/paste this link:</p>
        <p style="margin: 0; font-size: 12px; color: #64748b; word-break: break-all;">${downloadUrl}</p>
      </div>
    `.trim()

    const result = await sendResendEmail(buyerEmail, subject, html)
    return new Response(JSON.stringify({ ok: true, result }), {
      status: 200,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('free-download-email error', e)
    return new Response(JSON.stringify({ ok: false, error: (e as Error)?.message || 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    })
  }
})
