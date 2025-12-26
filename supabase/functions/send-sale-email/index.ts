// Supabase Edge Function: send-sale-email
// Deploy with: supabase functions deploy send-sale-email
// Invoke with: POST /functions/v1/send-sale-email
// Expects JSON: { beatTitle, license, buyerEmail, amount }
// Requires RESEND_API_KEY (or SENDGRID_API_KEY) in function env.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'RiddimBase <support@riddimbase.app>'
const OWNER_EMAIL = Deno.env.get('OWNER_EMAIL') || 'owner@example.com'

const ALLOWED_ORIGINS = new Set([
  'https://www.riddimbase.app',
  'https://riddimbase.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
])

const buildCorsHeaders = (origin: string | null) => {
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : '*'
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    Vary: 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

async function sendResendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY missing; skipping real send.')
    return { skipped: true }
  }
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  })
  const data = await resp.json()
  return data
}

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = buildCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400, headers: corsHeaders })
  }
  const { beatTitle, license, buyerEmail, amount } = body
  if (!beatTitle || !license || !amount) {
    return new Response('Missing required fields', { status: 400, headers: corsHeaders })
  }
  const subject = `License Purchase: ${beatTitle}`
  const html = `<h2>New Beat Sale</h2><p><strong>${beatTitle}</strong> licensed (${license}) for $${amount}.</p><p>Buyer: ${buyerEmail || 'N/A'}</p>`
  const ownerResult = await sendResendEmail(OWNER_EMAIL, subject, html)
  if (buyerEmail) {
    await sendResendEmail(buyerEmail, `Your ${license} License for ${beatTitle}`, `<p>Thank you for purchasing <strong>${beatTitle}</strong>.</p><p>License: ${license} – Amount: $${amount}</p>`)
  }
  return new Response(JSON.stringify({ ok: true, ownerResult }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
