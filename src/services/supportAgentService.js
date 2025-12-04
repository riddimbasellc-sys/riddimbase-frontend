// Support agent + assignment service backed by Supabase only.
// Adjust path to existing Supabase client (was ../supabaseClient causing Vite error)
import { supabase } from '../lib/supabaseClient'

export async function fetchAgents() {
  try {
    const { data, error } = await supabase.from('support_agents').select('*').order('created_at', { ascending: true })
    if (!error && data) return data
    throw error
  } catch (e) {
    console.warn('[supportAgentService] fetchAgents error', e?.message || e)
    return []
  }
}

export async function createAgent(agent) {
  const avatarVariant = agent.avatarVariant || 'male'
  const variantMap = {
    male: '/agent-male.svg',
    female: '/agent-female.svg'
  }
  const record = {
    id: crypto.randomUUID(),
    user_id: agent.userId || null,
    display_name: agent.displayName || agent.name || 'Agent',
    avatar_url: variantMap[avatarVariant] || variantMap.male,
    email: agent.email || null,
    phone: agent.phone || null,
    address: agent.address || null,
    start_date: agent.startDate || null,
    work_days: agent.workDays || ['Mon','Tue','Wed','Thu','Fri'],
    work_start: agent.workStart || '08:00',
    work_end: agent.workEnd || '17:00',
    status: 'offline',
    last_status_at: new Date().toISOString(),
    active: true,
    created_at: new Date().toISOString()
  }
  try {
    const { data, error } = await supabase.from('support_agents').insert(record).select().single()
    if (error) throw error
    return data
  } catch (e) {
    console.warn('[supportAgentService] createAgent error', e?.message || e)
    return null
  }
}

export async function updateAgent(id, updates) {
  const variantMap = {
    male: '/agent-male.svg',
    female: '/agent-female.svg'
  }
  let finalUpdates = { ...updates }
  if (updates.avatarVariant) {
    finalUpdates.avatar_url = variantMap[updates.avatarVariant] || variantMap.male
    delete finalUpdates.avatarVariant
  }
  try {
    const { data, error } = await supabase.from('support_agents').update(finalUpdates).eq('id', id).select().single()
    if (error) throw error
    return data
  } catch (e) {
    console.warn('[supportAgentService] updateAgent error', e?.message || e)
    return null
  }
}

export async function updateAgentStatus(id, status) {
  const allowed = ['present','lunch','eod','offline']
  if (!allowed.includes(status)) return null
  const updates = { status, last_status_at: new Date().toISOString() }
  try {
    const { data, error } = await supabase.from('support_agents').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  } catch (e) {
    console.warn('[supportAgentService] updateAgentStatus error', e?.message || e)
    return null
  }
}

export async function toggleAgentActive(id, active) {
  return updateAgent(id, { active })
}

export async function deleteAgent(id) {
  try {
    const { error } = await supabase.from('support_agents').delete().eq('id', id)
    if (error) throw error
    return true
  } catch (e) {
    console.warn('[supportAgentService] deleteAgent error', e?.message || e)
    return false
  }
}

// Assignment functions
export async function fetchAssignments() {
  try {
    const { data, error } = await supabase.from('chat_assignments').select('*')
    if (error) throw error
    return data || []
  } catch (e) {
    console.warn('[supportAgentService] fetchAssignments error', e?.message || e)
    return []
  }
}

export async function getAssignment(kind, targetId) {
  const all = await fetchAssignments()
  return all.find(a => a.kind === kind && a.target_id === targetId && a.status !== 'released') || null
}

export async function assignAgent({ agentId, kind, targetId }) {
  const record = {
    id: crypto.randomUUID(),
    agent_id: agentId,
    kind,
    target_id: targetId,
    status: 'assigned',
    assigned_at: new Date().toISOString()
  }
  try {
    const { data, error } = await supabase.from('chat_assignments').insert(record).select().single()
    if (error) throw error
    return data
  } catch (e) {
    console.warn('[supportAgentService] assignAgent error', e?.message || e)
    return null
  }
}

export async function releaseAssignment(id) {
  try {
    const { data, error } = await supabase.from('chat_assignments').update({ status: 'released' }).eq('id', id).select().single()
    if (error) throw error
    return data
  } catch (e) {
    console.warn('[supportAgentService] releaseAssignment error', e?.message || e)
    return null
  }
}

export async function claimAssignment({ agentId, kind, targetId }) {
  // Claim replaces existing unassigned (if any) or creates new
  return assignAgent({ agentId, kind, targetId })
}

export async function fetchAgentById(id) {
  const agents = await fetchAgents()
  return agents.find(a => a.id === id)
}
