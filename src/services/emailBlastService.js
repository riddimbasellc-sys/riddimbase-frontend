// Email Blast Service (Supabase + optional edge function integration)
// Tables: email_blasts, email_blast_recipients, profiles

import { supabase } from '../lib/supabaseClient'

const TABLE_BLASTS = 'email_blasts'
const TABLE_RECIPIENTS = 'email_blast_recipients'
const TABLE_PROFILES = 'profiles'

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

const FOOTER = `\n\n—\nYou are receiving this email because you have an account on RiddimBase. To unsubscribe from future promotional emails, update your notification preferences in your profile.`

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
    if (includeFooter) content += FOOTER
    return {
      email: r.email,
      body: content,
      subject: applyVariables(subject, r),
    }
  })

  const functionsBase = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL
  if (functionsBase) {
    try {
      const res = await fetch(`${functionsBase}/email-blast`, {
        method: 'POST',
        body: JSON.stringify({ html, recipients: personalized, attachments }),
      })
      if (!res.ok) return false
    } catch {
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

