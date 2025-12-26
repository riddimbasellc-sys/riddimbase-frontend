// Email Blast Service (Supabase + optional edge function integration)
// Tables: email_blasts, email_blast_recipients, profiles

import { supabase } from '../lib/supabaseClient'

const TABLE_BLASTS = 'email_blasts'
const TABLE_RECIPIENTS = 'email_blast_recipients'
const TABLE_PROFILES = 'profiles'

// Shared footer snippets for blasts
export const EMAIL_BLAST_FOOTER_TEXT = `\n\n—\nYou are receiving this email because you have an account on RiddimBase. To unsubscribe from future promotional emails, update your notification preferences in your profile.`

// Simple, mobile-friendly footer inspired by modern SaaS emails.
// Uses only inline styles so most email clients render it correctly.
// Social URLs should match the Admin > Social Profiles configuration.
export const EMAIL_BLAST_FOOTER_HTML = `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:32px;background:#020617;padding:24px 12px 20px 12px;border-radius:16px;">
    <tr>
      <td align="center" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#f97373;font-size:0;letter-spacing:6px;text-transform:uppercase;">
        <a href="https://www.facebook.com/riddimbase" style="display:inline-block;margin:0 6px;width:22px;height:22px;border-radius:999px;background:#111827;color:#fee2e2;text-decoration:none;line-height:22px;font-size:12px;font-weight:600;">f</a>
        <a href="https://twitter.com/riddimbase" style="display:inline-block;margin:0 6px;width:22px;height:22px;border-radius:999px;background:#111827;color:#fee2e2;text-decoration:none;line-height:22px;font-size:12px;font-weight:600;">X</a>
        <a href="https://www.youtube.com/@riddimbase" style="display:inline-block;margin:0 6px;width:22px;height:22px;border-radius:999px;background:#111827;color:#fee2e2;text-decoration:none;line-height:22px;font-size:12px;font-weight:600;">▶</a>
        <a href="https://www.instagram.com/riddimbase" style="display:inline-block;margin:0 6px;width:22px;height:22px;border-radius:999px;background:#111827;color:#fee2e2;text-decoration:none;line-height:22px;font-size:12px;font-weight:600;">IG</a>
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
  const personalized = (recipients || []).map((r) => {
    let content = applyVariables(body, r)
    const footer = includeFooter
      ? html
        ? EMAIL_BLAST_FOOTER_HTML
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

