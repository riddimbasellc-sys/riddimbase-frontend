// Email Blast Service (Supabase + optional edge function integration)
// Tables: email_blasts, email_blast_recipients, profiles

import { supabase } from '../lib/supabaseClient'
import { getSocialLinks } from './socialLinksService'

const TABLE_BLASTS = 'email_blasts'
const TABLE_RECIPIENTS = 'email_blast_recipients'
const TABLE_PROFILES = 'profiles'

// Shared footer snippets for blasts
export const EMAIL_BLAST_FOOTER_TEXT = `\n\n—\nYou are receiving this email because you have an account on RiddimBase. To unsubscribe from future promotional emails, update your notification preferences in your profile.`

// Build a dynamic HTML footer based on the current site social links.
// Icons are inline SVG so most modern email clients will render them.
function buildSocialIconSvg(network, url) {
  if (!url) return ''
  const baseAnchor =
    'display:inline-block;margin:0 6px;width:26px;height:26px;border-radius:999px;background:#020617;border:1px solid #f97373;text-decoration:none;text-align:center;vertical-align:middle;'
  const svgCommon =
    'width:16px;height:16px;vertical-align:middle;'

  switch (network) {
    case 'instagram':
      return `
        <a href="${url}" style="${baseAnchor}">
          <svg viewBox="0 0 24 24" style="${svgCommon}" fill="none" stroke="#fee2e2" stroke-width="1.8">
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4.5" />
            <circle cx="17" cy="7" r="1.2" />
          </svg>
        </a>`
    case 'youtube':
      return `
        <a href="${url}" style="${baseAnchor}">
          <svg viewBox="0 0 24 24" style="${svgCommon}" fill="#fee2e2">
            <path d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.1 5 12 5 12 5s-6.1 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.9 19 12 19 12 19s6.1 0 7.84-.43A2.5 2.5 0 0 0 21.6 16.8 26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8Z" />
            <path d="M10 15.25V8.75L15 12Z" />
          </svg>
        </a>`
    case 'tiktok':
      return `
        <a href="${url}" style="${baseAnchor}">
          <svg viewBox="0 0 24 24" style="${svgCommon}" fill="#fee2e2">
            <path d="M15.5 3h2.1c.2 1 .7 1.9 1.4 2.6a4 4 0 0 0 2.3 1v2.3a6.4 6.4 0 0 1-3.5-1.1v6.5A5.7 5.7 0 0 1 12 20.9 5.9 5.9 0 0 1 6.1 15 5.8 5.8 0 0 1 12 9.1h.5v2.8A3.1 3.1 0 0 0 9.9 15 3 3 0 0 0 12 18a3 3 0 0 0 3.1-3V3Z" />
          </svg>
        </a>`
    case 'twitter':
      return `
        <a href="${url}" style="${baseAnchor}">
          <svg viewBox="0 0 24 24" style="${svgCommon}" fill="#fee2e2">
            <path d="M16.5 3H20l-7 8.2L21 21h-4.5l-5-6-5.7 6H2.2l7.5-8.5L3 3h4.6l4.5 5.5Z" />
          </svg>
        </a>`
    case 'facebook':
      return `
        <a href="${url}" style="${baseAnchor}">
          <svg viewBox="0 0 24 24" style="${svgCommon}" fill="#fee2e2">
            <path d="M13.5 21v-7h2.3l.4-3h-2.7V9a1.1 1.1 0 0 1 1.2-1.2h1.6V5.1H14a3.4 3.4 0 0 0-3.6 3.6v2.3H8v3h2.4v7Z" />
          </svg>
        </a>`
    case 'soundcloud':
      return `
        <a href="${url}" style="${baseAnchor}">
          <svg viewBox="0 0 24 24" style="${svgCommon}" fill="#fee2e2">
            <path d="M9.5 7.2A4.7 4.7 0 0 1 14 4.5a4.8 4.8 0 0 1 4.6 3.4A3.4 3.4 0 0 1 22 11.2 3.3 3.3 0 0 1 18.7 15H9a3.2 3.2 0 0 1-3.2-3.1A3.3 3.3 0 0 1 9.5 7.2Z" />
            <path d="M4 9.5A2.7 2.7 0 0 0 2.5 12 2.7 2.7 0 0 0 4 14.5Z" />
          </svg>
        </a>`
    case 'spotify':
      return `
        <a href="${url}" style="${baseAnchor}">
          <svg viewBox="0 0 24 24" style="${svgCommon}" fill="#fee2e2">
            <circle cx="12" cy="12" r="9" />
            <path d="M8 10.5c2.3-.6 5-.4 7.2.5" stroke="#020617" stroke-width="1.4" stroke-linecap="round" fill="none" />
            <path d="M8.4 13.2c1.8-.4 3.8-.3 5.4.4" stroke="#020617" stroke-width="1.3" stroke-linecap="round" fill="none" />
            <path d="M8.7 15.6c1.4-.3 2.8-.2 4 .3" stroke="#020617" stroke-width="1.2" stroke-linecap="round" fill="none" />
          </svg>
        </a>`
    default:
      return ''
  }
}

function buildEmailFooterHtmlFromSocials(socials) {
  const iconsHtml = (socials || [])
    .filter((s) => s && s.url && s.url.trim() && s.network)
    .map((s) => buildSocialIconSvg(s.network, s.url.trim()))
    .join('')

  return `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:32px;background:#020617;padding:24px 12px 20px 12px;border-radius:16px;">
    <tr>
      <td align="center" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#f97373;font-size:0;letter-spacing:6px;text-transform:uppercase;">
        ${iconsHtml}
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top:10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#f9fafb;font-size:13px;font-weight:600;">
        RiddimBase
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top:4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#fca5a5;font-size:11px;">
        Home of Caribbean Beats
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top:14px;padding-bottom:2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;">
          <tr>
            <td style="padding:4px 6px;">
              <a href="https://riddimbase.app" style="display:inline-block;padding:8px 14px;border-radius:999px;background:#ef4444;color:#f9fafb;font-size:11px;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-decoration:none;">Open RiddimBase</a>
            </td>
            <td style="padding:4px 6px;">
              <a href="https://riddimbase.app/studio" style="display:inline-block;padding:8px 14px;border-radius:999px;background:#111827;color:#f9fafb;font-size:11px;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-decoration:none;">Launch Recording Lab</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e5e7eb;font-size:11px;">
        Our friendly support team is available <a href="https://riddimbase.app/support" style="color:#f97373;text-decoration:none;">24/7</a>.
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top:10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#9ca3af;font-size:10px;">
        If you no longer wish to receive these emails, you may
        <a href="https://riddimbase.app/account/notifications" style="color:#f97373;text-decoration:none;"> unsubscribe</a>
        or update your
        <a href="https://riddimbase.app/account/notifications" style="color:#f97373;text-decoration:none;"> email preferences</a>.
      </td>
    </tr>
  </table>
  `
}

export async function getEmailBlastFooterHtml() {
  try {
    const socials = await getSocialLinks()
    const active = (socials || []).filter((s) => s && s.url && s.url.trim())
    return buildEmailFooterHtmlFromSocials(active)
  } catch {
    return buildEmailFooterHtmlFromSocials([])
  }
}

export async function listEmailBlasts() {
  const { data, error } = await supabase
    .from(TABLE_BLASTS)
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('[emailBlastService] listEmailBlasts error', error.message)
    return []
  }

  // Map to shape expected by UI
  return (data || []).map((b) => ({
    id: b.id,
    subject: b.subject,
    body: b.body,
    totalRecipients: b.total_recipients ?? null,
    includeFooter: b.include_footer,
    html: b.html,
    createdAt: b.created_at,
  }))
}

export async function createEmailBlast({
  subject,
  body,
  totalRecipients,
  includeFooter = false,
  html = false,
}) {
  const payload = {
    subject: subject.trim(),
    body: body.trim(),
    total_recipients: totalRecipients,
    include_footer: includeFooter,
    html,
  }

  const { data, error } = await supabase
    .from(TABLE_BLASTS)
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.warn('[emailBlastService] createEmailBlast error', error.message)
    return null
  }

  return {
    id: data.id,
    subject: data.subject,
    body: data.body,
    totalRecipients: data.total_recipients,
    includeFooter: data.include_footer,
    html: data.html,
    createdAt: data.created_at,
  }
}

// Fetch all users (profiles) via Supabase
export async function fetchAllUsers() {
  try {
    const { data, error } = await supabase
      .from(TABLE_PROFILES)
      .select('id, email, display_name, role')

    if (error) {
      console.warn('[emailBlastService] fetchAllUsers error', error.message)
      return []
    }
    return (data || []).filter((u) => !!u.email)
  } catch (e) {
    console.warn('[emailBlastService] fetchAllUsers exception', e?.message)
    return []
  }
}

// Simulated send: calls optional edge function if configured else returns mock results
function applyVariables(text, user) {
  if (!text) return ''
  return text.replace(
    /{{\s*display_name\s*}}/gi,
    user?.display_name || user?.email || 'there',
  )
}

export async function sendEmailBlast({
  subject,
  body,
  recipients,
  includeFooter = false,
  html = false,
  attachments = [],
}) {
  let footerHtml = ''
  if (includeFooter && html) {
    footerHtml = await getEmailBlastFooterHtml()
  }

  const personalized = (recipients || []).map((r) => {
    let content = applyVariables(body, r)
    const footer = includeFooter
      ? html
        ? footerHtml
        : EMAIL_BLAST_FOOTER_TEXT
      : ''
    content += footer
    return {
      email: r.email,
      body: content,
      subject: applyVariables(subject, r),
    }
  })

  const configuredFunctionsBase = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL
    ? import.meta.env.VITE_SUPABASE_FUNCTIONS_URL.trim()
    : ''
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    ? import.meta.env.VITE_SUPABASE_URL.trim()
    : ''

  // Prefer the API-gateway style edge functions endpoint:
  //   https://<project>.supabase.co/functions/v1/<fn>
  // This is generally more reliable for browser CORS than the *.functions.supabase.co host.
  let functionsBase = configuredFunctionsBase
  if (supabaseUrl) {
    const gatewayBase = `${supabaseUrl.replace(/\/$/, '')}/functions/v1`
    if (!functionsBase) functionsBase = gatewayBase
    if (functionsBase.includes('.functions.supabase.co')) functionsBase = gatewayBase
  }

  if (functionsBase) {
    try {
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const headers = {}
      if (anonKey) {
        headers.Authorization = `Bearer ${anonKey}`
        headers.apikey = anonKey
      }
      headers['Content-Type'] = 'application/json'
      const res = await fetch(`${functionsBase}/email-blast`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ html, recipients: personalized, attachments }),
      })
      if (!res.ok) {
        let text = ''
        try {
          text = await res.text()
        } catch {}
        console.warn('[emailBlastService] email-blast failed', res.status, res.statusText, text)
        return false
      }
    } catch (e) {
      console.warn('[emailBlastService] email-blast exception', e?.message || e)
      return false
    }
  }

  // Caller logs per-recipient rows via saveBlastRecipients once blast row exists.
  return true
}

// Helper to store recipients for a given blast id
export async function saveBlastRecipients(blastId, recipients) {
  if (!blastId || !recipients?.length) return
  const rows = recipients.map((r) => ({
    blast_id: blastId,
    user_id: r.id || null,
    email: r.email,
    status: 'sent',
    sent_at: new Date().toISOString(),
  }))
  const { error } = await supabase.from(TABLE_RECIPIENTS).insert(rows)
  if (error) {
    console.warn('[emailBlastService] saveBlastRecipients error', error.message)
  }
}

