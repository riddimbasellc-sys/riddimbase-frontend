// Supabase Edge Function: payout-paid-email
// Deploy: supabase functions deploy payout-paid-email
// Invoke: POST /functions/v1/payout-paid-email
// JSON: { producerEmail, amount, currency }

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'no-reply@riddimbase.dev'
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
  return await resp.json()
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
  const { producerEmail, amount, currency } = body
  if (!producerEmail || !amount) {
    return new Response('Missing fields', { status: 400, headers: corsHeaders })
  }
  const subject = `Payout Completed: $${amount}`
  const htmlProducer = `<p>Your payout of <strong>$${amount} ${currency || 'USD'}</strong> has been completed.</p><p>Thanks for contributing to RiddimBase!</p>`
  const htmlOwner = `<p>Payout processed for <strong>${producerEmail}</strong> amount <strong>$${amount} ${currency || 'USD'}</strong>.</p>`
  const producerResult = await sendResendEmail(producerEmail, subject, htmlProducer)
  const ownerResult = await sendResendEmail(OWNER_EMAIL, subject, htmlOwner)
  return new Response(JSON.stringify({ ok: true, producerResult, ownerResult }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
