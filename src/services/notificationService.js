const functionsBase = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL

async function postJson(url, payload) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return await res.json()
  } catch (e) {
    console.warn('[notificationService] request failed', e)
    return null
  }
}

export async function sendSaleEmail({ beatTitle, license, buyerEmail, amount }) {
  if (!functionsBase) return null
  return postJson(`${functionsBase}/send-sale-email`, { beatTitle, license, buyerEmail, amount })
}

export async function sendPayoutEmail({ producerEmail, amount, currency }) {
  if (!functionsBase) return null
  return postJson(`${functionsBase}/payout-paid-email`, { producerEmail, amount, currency })
}

export async function sendPayoutRequestEmail({ producerEmail, amount, currency }) {
  if (!functionsBase) return null
  return postJson(`${functionsBase}/payout-request-email`, { producerEmail, amount, currency })
}

// Support / moderation notifications (edge functions can be added later)
export async function sendSupportChatEmail({ ticketId, message, contactEmail }) {
  if (!functionsBase || !contactEmail) return null
  return postJson(`${functionsBase}/support-chat-email`, { ticketId, message, contactEmail })
}

export async function sendReportChatEmail({ reportId, message, recipientEmail }) {
  if (!functionsBase || !recipientEmail) return null
  return postJson(`${functionsBase}/report-chat-email`, { reportId, message, recipientEmail })
}

// Free download delivery email (optional edge function)
export async function sendFreeDownloadEmail({ beatTitle, downloadUrl, buyerEmail }) {
  if (!functionsBase || !buyerEmail) return null
  return postJson(`${functionsBase}/free-download-email`, { beatTitle, downloadUrl, buyerEmail })
}
