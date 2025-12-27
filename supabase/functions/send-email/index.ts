// Supabase Edge Function: send-email
// Deploy with: supabase functions deploy send-email
// Invoke with: POST /functions/v1/send-email
//
// Payload:
// {
//   "template": "welcome | bonus_credits | credits_added | purchase_receipt | collab_invite | email_blast",
//   "to": "recipient@email.com" | ["a@b.com", "c@d.com"],
//   "subject": "Optional override subject",
//   "data": { "...": "dynamic per template" },
//   "attachments": [ { "name": "file.pdf", "type": "application/pdf", "size": 123, "base64": "..." } ]
// }

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = 'RiddimBase <no-reply@riddimbase.app>'

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

type TemplateName =
  | 'welcome'
  | 'bonus_credits'
  | 'credits_added'
  | 'purchase_receipt'
  | 'collab_invite'
  | 'email_blast'

interface AttachmentInput {
  name: string
  type?: string
  size?: number
  base64: string
}

interface SendEmailPayload {
  template: TemplateName
  to: string | string[]
  subject?: string
  data?: Record<string, unknown>
  attachments?: AttachmentInput[]
}

interface BuiltEmail {
  subject: string
  html: string
  text: string
}

function jsonResponse(corsHeaders: Record<string, string>, status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  })
}

function toArray(value: string | string[] | undefined | null): string[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function getString(data: Record<string, unknown>, key: string, fallback = ''): string {
  const v = data[key]
  return typeof v === 'string' ? v : fallback
}

function getNumber(data: Record<string, unknown>, key: string, fallback = 0): number {
  const v = data[key]
  const num = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(num) ? num : fallback
}

function buildWelcomeEmail(data: Record<string, unknown> = {}): BuiltEmail {
  const displayName = getString(data, 'displayName') || getString(data, 'name') || 'there'

  const subject = 'Welcome to RiddimBase 🔥'
  const text = `Hey ${displayName}, welcome to RiddimBase — the Caribbean's home for beats, producers & Recording Lab.`

  const html = `
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0;background:#0b0b0b;color:#ffffff;">
  <tr>
    <td align="center" style="padding:40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#121212;border-radius:12px;padding:30px;">
        <tr>
          <td align="center">
            <h1 style="color:#ff7a00;margin:0 0 8px 0;font-size:24px;">Welcome to RiddimBase</h1>
            <p style="font-size:16px;color:#cccccc;margin:0;">
              The Caribbean's home for beats, producers &amp; culture.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 0;">
            <p style="font-size:15px;line-height:1.6;margin:0 0 10px 0;">
              Hey ${displayName}, you're officially part of a growing movement built for producers, artists, and creatives.
            </p>
            <ul style="color:#bbbbbb;padding-left:20px;margin:10px 0 0 0;font-size:14px;">
              <li>Upload &amp; sell beats</li>
              <li>Automated royalty splits</li>
              <li>Recording Lab with studio credits</li>
              <li>Built for the culture</li>
            </ul>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
  `.trim()

  return { subject, html, text }
}

function buildBonusCreditsEmail(data: Record<string, unknown> = {}): BuiltEmail {
  const displayName = getString(data, 'displayName') || getString(data, 'name') || 'there'
  const credits = getNumber(data, 'credits', getNumber(data, 'amount', 0))
  const creditsStr = credits.toLocaleString('en-US')

  const subject = '🎉 Bonus Recording Lab credits added!'
  const text = `Hi ${displayName}, you just received ${creditsStr} bonus Recording Lab credits on RiddimBase.`

  const html = `
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0;background:#0b0b0b;color:#ffffff;">
  <tr>
    <td align="center" style="padding:40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#121212;border-radius:12px;padding:30px;">
        <tr>
          <td align="center">
            <h1 style="color:#00ffa3;margin:0 0 8px 0;font-size:24px;">Credits Added</h1>
            <p style="color:#cccccc;font-size:16px;margin:0;">
              Hi ${displayName}, we added <strong style="color:#00ffa3;">${creditsStr} credits</strong> to your Recording Lab account.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
  `.trim()

  return { subject, html, text }
}

function buildCreditsAddedEmail(data: Record<string, unknown> = {}): BuiltEmail {
  const displayName = getString(data, 'displayName') || getString(data, 'name') || 'there'
  const credits = getNumber(data, 'credits', getNumber(data, 'amount', 0))
  const balance = getNumber(data, 'balance', 0)

  const subject = 'Recording Lab credits updated'
  const text = `Hi ${displayName}, ${credits.toLocaleString('en-US')} credits were added. New balance: ${balance.toLocaleString('en-US')} credits.`

  const html = `
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0;background:#020617;color:#e2e8f0;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#020617;border-radius:16px;border:1px solid #1f2937;padding:24px;">
        <tr>
          <td>
            <h1 style="margin:0 0 8px 0;font-size:20px;color:#f9fafb;">Credits updated</h1>
            <p style="margin:0;font-size:14px;">Hi ${displayName}, we added <strong>${credits.toLocaleString('en-US')} credits</strong>. Your balance is now <strong>${balance.toLocaleString('en-US')} credits</strong>.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
  `.trim()

  return { subject, html, text }
}

function buildPurchaseReceiptEmail(data: Record<string, unknown> = {}): BuiltEmail {
  const displayName = getString(data, 'displayName') || getString(data, 'name') || 'there'
  const orderId = getString(data, 'orderId') || getString(data, 'reference')
  const total = getString(data, 'total') || getString(data, 'amount')

  const subject = 'Your RiddimBase purchase receipt'
  const text = `Hi ${displayName}, thanks for your purchase. ${orderId ? `Order: ${orderId}. ` : ''}${total ? `Total: ${total}.` : ''}`

  const html = `
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0;background:#020617;color:#e2e8f0;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#020617;border-radius:16px;border:1px solid #1f2937;padding:24px;">
        <tr>
          <td>
            <h1 style="margin:0 0 8px 0;font-size:20px;color:#f9fafb;">Purchase receipt</h1>
            <p style="margin:0 0 8px 0;font-size:14px;">Hi ${displayName}, thanks for your purchase on RiddimBase.</p>
            ${orderId ? `<p style="margin:0 0 4px 0;font-size:14px;">Order: <strong>${orderId}</strong></p>` : ''}
            ${total ? `<p style="margin:0 0 4px 0;font-size:14px;">Total: <strong>${total}</strong></p>` : ''}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
  `.trim()

  return { subject, html, text }
}

function buildCollabInviteEmail(data: Record<string, unknown> = {}): BuiltEmail {
  const displayName = getString(data, 'displayName') || getString(data, 'name') || 'there'
  const fromName = getString(data, 'fromName', 'A collaborator')
  const projectTitle = getString(data, 'projectTitle') || getString(data, 'project', 'a project')

  const subject = `${fromName} invited you to collaborate on RiddimBase`
  const text = `Hey ${displayName}, ${fromName} invited you to collaborate on ${projectTitle}.`

  const html = `
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0;background:#020617;color:#e2e8f0;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#020617;border-radius:16px;border:1px solid #1f2937;padding:24px;">
        <tr>
          <td>
            <h1 style="margin:0 0 8px 0;font-size:20px;color:#f9fafb;">Collaboration invite</h1>
            <p style="margin:0;font-size:14px;">Hey ${displayName}, ${fromName} invited you to collaborate on <strong>${projectTitle}</strong> on RiddimBase.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
  `.trim()

  return { subject, html, text }
}

function buildEmailBlastEmail(data: Record<string, unknown> = {}): BuiltEmail {
  const subject = getString(data, 'subject', 'RiddimBase update')
  const html = getString(data, 'html', '<p>RiddimBase update</p>')
  const text = getString(data, 'text', 'RiddimBase update')
  return { subject, html, text }
}

function buildEmailFromTemplate(template: TemplateName, data: Record<string, unknown> = {}): BuiltEmail {
  switch (template) {
    case 'welcome':
      return buildWelcomeEmail(data)
    case 'bonus_credits':
      return buildBonusCreditsEmail(data)
    case 'credits_added':
      return buildCreditsAddedEmail(data)
    case 'purchase_receipt':
      return buildPurchaseReceiptEmail(data)
    case 'collab_invite':
      return buildCollabInviteEmail(data)
    case 'email_blast':
      return buildEmailBlastEmail(data)
    default:
      return buildEmailBlastEmail(data)
  }
}

async function sendViaResend(
  toList: string[],
  subject: string,
  html: string,
  text: string,
  attachments: AttachmentInput[] = [],
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
    to: toList,
    subject,
    html,
    text,
    attachments: mappedAttachments.length ? mappedAttachments : undefined,
  }

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(payload),
  })

  const result = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    const detail = typeof (result as any)?.message === 'string' ? (result as any).message : 'Resend API request failed'
    throw new Error(detail)
  }

  return result
}

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = buildCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse(corsHeaders, 405, { success: false, error: 'Method not allowed' })
  }

  let payload: SendEmailPayload
  try {
    payload = (await req.json()) as SendEmailPayload
  } catch {
    return jsonResponse(corsHeaders, 400, { success: false, error: 'Invalid JSON payload' })
  }

  const template = payload?.template
  const recipients = toArray(payload?.to)
  const data = (payload?.data || {}) as Record<string, unknown>
  const attachments = Array.isArray(payload?.attachments) ? payload.attachments : []

  if (!template) {
    return jsonResponse(corsHeaders, 400, { success: false, error: 'Missing template' })
  }

  if (!recipients.length) {
    return jsonResponse(corsHeaders, 400, { success: false, error: 'Missing recipient(s)' })
  }

  try {
    const built = buildEmailFromTemplate(template, data)
    const subject = payload?.subject || built.subject

    await sendViaResend(recipients, subject, built.html, built.text, attachments)

    return jsonResponse(corsHeaders, 200, { success: true, message: 'Email sent' })
  } catch (err) {
    console.error('send-email error', err)
    const msg = err instanceof Error ? err.message : 'Failed to send email'
    return jsonResponse(corsHeaders, 500, { success: false, error: msg })
  }
})
