// Support ticket service backed by Supabase
// Tables: support_tickets, support_messages

import { supabase } from '../lib/supabaseClient'

const TABLE_TICKETS = 'support_tickets'
const TABLE_MESSAGES = 'support_messages'

export async function listSupportTickets() {
  const { data, error } = await supabase
    .from(TABLE_TICKETS)
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('[supportTicketService] listSupportTickets error', error.message)
    return []
  }
  return data || []
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
    return { stored: false }
  }
  return data
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

export async function addTicketMessage({ ticketId, senderId, senderType, message }) {
  if (!ticketId || !message) return null
  const payload = {
    ticket_id: ticketId,
    sender_id: senderId || null,
    sender_type: senderType,
    message,
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
