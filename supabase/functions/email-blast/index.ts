// Supabase Edge Function: email-blast
// Deploy with: supabase functions deploy email-blast
// Invoke with: POST /functions/v1/email-blast
// Expects JSON: { html, recipients: [{ email, subject, body }], attachments?: [{ name, type, size, base64 }] }
// Uses RESEND_API_KEY and FROM_EMAIL from function environment.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
// Force email blast to always come from the main support address
const FROM_EMAIL = 'RiddimBase <support@riddimbase.app>'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface BlastRecipient {
  email: string
  subject: string
  body: string
}

interface BlastAttachment {
  name: string
  type: string
  size: number
  base64: string
}

interface BlastPayload {
  html?: boolean
  recipients: BlastRecipient[]
  attachments?: BlastAttachment[]
}

async function sendResendEmail(
  to: string,
  subject: string,
  body: string,
  html: boolean,
  attachments: BlastAttachment[] = [],
) {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY missing; skipping real send.')
    return { skipped: true }
  }

  const mappedAttachments = attachments.map((a) => ({
    filename: a.name,
    content: a.base64,
    contentType: a.type || 'application/octet-stream',
  }))

  const payload: Record<string, unknown> = {
    from: FROM_EMAIL,
    to: [to],
    subject,
    attachments: mappedAttachments.length ? mappedAttachments : undefined,
  }

  if (html) {
    payload.html = body
  } else {
    payload.text = body
  }

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(payload),
  })

  const data = await resp.json()
  if (!resp.ok) {
    console.error('Resend error', data)
    throw new Error('Failed to send via Resend')
  }
  return data
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
  }

  let body: BlastPayload
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400, headers: corsHeaders })
  }

  const { html = false, recipients, attachments = [] } = body || {}

  if (!Array.isArray(recipients) || recipients.length === 0) {
    return new Response('No recipients provided', { status: 400, headers: corsHeaders })
  }

  try {
    const results = [] as unknown[]
    for (const r of recipients) {
      if (!r?.email || !r?.subject || !r?.body) continue
      const res = await sendResendEmail(r.email, r.subject, r.body, html, attachments)
      results.push({ email: r.email, ok: true, result: res })
    }

    return new Response(JSON.stringify({ ok: true, sent: results.length, results }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (e) {
    console.error('email-blast error', e)
    return new Response('Internal error', { status: 500, headers: corsHeaders })
  }
})
