// Support ticket service backed by Supabase
// Tables: support_tickets, support_messages

import { supabase } from '../lib/supabaseClient'

const TABLE_TICKETS = 'support_tickets'
const TABLE_MESSAGES = 'support_messages'
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export async function listSupportTickets() {
  // Prefer server-side admin endpoint so RLS never hides tickets from admins.
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/admin/support-tickets`)
      if (!res.ok) throw new Error('Failed to fetch tickets')
      const payload = await res.json()
      const rows = payload?.tickets || []
      return rows.map((t) => ({
        id: t.id,
        subject: t.subject,
        message: t.message,
        status: t.status,
        priority: t.priority || 'normal',
        category: t.category || 'general',
        createdAt: t.created_at,
        userId: t.created_by || t.user_id || null,
        assignedTo: t.assigned_to || null,
        contactEmail: t.contact_email || null,
        contactPhone: t.contact_phone || null,
      }))
    } catch (e) {
      console.warn('[supportTicketService] admin listSupportTickets error', e?.message || e)
      // fall through to client-side Supabase as a backup
    }
  }

  const { data, error } = await supabase
    .from(TABLE_TICKETS)
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('[supportTicketService] listSupportTickets error', error.message)
    return []
  }
  return (data || []).map((t) => ({
    id: t.id,
    subject: t.subject,
    message: t.message,
    status: t.status,
    priority: t.priority || 'normal',
    category: t.category || 'general',
    createdAt: t.created_at,
    userId: t.created_by || t.user_id || null,
    assignedTo: t.assigned_to || null,
    contactEmail: t.contact_email || null,
    contactPhone: t.contact_phone || null,
  }))
}

export async function createSupportTicket(ticket) {
  const payload = {
    created_by: ticket.userId || null,
    assigned_to: ticket.assignedTo || null,
    subject: ticket.subject,
    status: 'open',
    priority: ticket.priority || 'normal',
    category: ticket.category || 'general',
    message: ticket.message || '',
    contact_email: ticket.contactEmail || null,
    contact_phone: ticket.contactPhone || null,
  }

  const { data, error } = await supabase
    .from(TABLE_TICKETS)
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.warn('[supportTicketService] createSupportTicket error', error.message)
    return { stored: false, error: error.message }
  }
  return { stored: true, ticket: data }
}

export async function updateSupportTicket(id, patch) {
  if (!id) return null
  const mapped = {
    status: patch.status,
    assigned_to: patch.assignedTo,
    priority: patch.priority,
    category: patch.category,
  }
  Object.keys(mapped).forEach(k => mapped[k] === undefined && delete mapped[k])

  const { data, error } = await supabase
    .from(TABLE_TICKETS)
    .update(mapped)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.warn('[supportTicketService] updateSupportTicket error', error.message)
    return null
  }
  return data
}

export async function listTicketMessages(ticketId) {
  if (!ticketId) return []
  const { data, error } = await supabase
    .from(TABLE_MESSAGES)
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })

  if (error) {
    console.warn('[supportTicketService] listTicketMessages error', error.message)
    return []
  }
  return data || []
}

export async function addTicketMessage({
  ticketId,
  senderId,
  senderType,
  message,
  attachmentUrl,
  attachmentType,
  attachmentName,
}) {
  if (!ticketId || (!message && !attachmentUrl)) return null
  const payload = {
    ticket_id: ticketId,
    sender_id: senderId || null,
    sender_type: senderType,
    message: message || '',
    attachment_url: attachmentUrl || null,
    attachment_type: attachmentType || null,
    attachment_name: attachmentName || null,
  }
  const { data, error } = await supabase
    .from(TABLE_MESSAGES)
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.warn('[supportTicketService] addTicketMessage error', error.message)
    return null
  }
  return data
}
