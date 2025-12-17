import supabase from '../lib/supabaseClient'

// Supabase-backed job requests repository
// Table: job_requests
// Expected columns:
// id (text, pk), user_id, title, description, category, genres (text[] or json), budget, currency,
// deadline_date (date), revisions_expected (int), reference_urls (json), status,
// bids (json array), assigned_provider_id, created_at, updated_at

const TABLE = 'job_requests'
const ESCROW_TABLE = 'job_escrow'

function safeArray(val) { return Array.isArray(val) ? val : (val ? [val] : []) }

export async function createJobRequestSupabase({ userId, title, description, category, genres=[], budget, currency='USD', deadlineDate, revisionsExpected=1, referenceUrls=[], }) {
  const id = 'job_' + Date.now() + '_' + Math.random().toString(36).slice(2,8)
  const payload = {
    id,
    user_id: userId,
    title,
    description,
    category,
    genres: genres,
    budget: Number(budget)||0,
    currency,
    deadline_date: deadlineDate || null,
    revisions_expected: revisionsExpected,
    reference_urls: referenceUrls,
    // New jobs start as pending and only appear on the public board once an admin approves them.
    status: 'pending',
    bids: [],
    assigned_provider_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  const { data, error } = await supabase.from(TABLE).insert(payload).select().single()
  if (error) throw error
  return mapRow(data)
}

export async function listJobRequestsSupabase({ status='open', category='all', genre='all', search='', minBudget=0, maxBudget=0, page=1, pageSize=12 }) {
  let query = supabase.from(TABLE).select('*', { count: 'exact' })
  if (status !== 'all') query = query.eq('status', status)
  if (category !== 'all') query = query.eq('category', category)
  if (genre !== 'all') query = query.contains('genres', [genre])
  if (search) query = query.ilike('title', `%${search}%`)
  if (minBudget) query = query.gte('budget', minBudget)
  if (maxBudget) query = query.lte('budget', maxBudget)
  const from = (page-1)*pageSize
  const to = from + pageSize - 1
  query = query.range(from, to).order('created_at', { ascending: false })
  const { data, error, count } = await query
  if (error) throw error
  return { data: (data||[]).map(mapRow), count }
}

export async function listJobRequestsByUserSupabase(userId) {
  const { data, error } = await supabase.from(TABLE).select('*').eq('user_id', userId).order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(mapRow)
}

export async function getJobRequestSupabase(jobId) {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', jobId).single()
  if (error) throw error
  return mapRow(data)
}

export async function addBidToJobSupabase(jobId, { providerId, amount, message }) {
  const job = await getJobRequestSupabase(jobId)
  const bids = safeArray(job.bids)
  const bid = { id: 'bid_' + Date.now() + '_' + Math.random().toString(36).slice(2,6), providerId, amount: Number(amount)||0, message: message||'', createdAt: new Date().toISOString() }
  bids.push(bid)
  const { data, error } = await supabase.from(TABLE).update({ bids, updated_at: new Date().toISOString() }).eq('id', jobId).select().single()
  if (error) throw error
  return mapRow(data)
}

export async function updateJobStatusSupabase(jobId, status, assignedProviderId=null, assignedBidAmount=null) {
  const fields = { status, updated_at: new Date().toISOString() }
  if (assignedProviderId) fields.assigned_provider_id = assignedProviderId
  if (typeof assignedBidAmount === 'number' && !Number.isNaN(assignedBidAmount)) {
    fields.budget = Number(assignedBidAmount)
  }
  const { data, error } = await supabase.from(TABLE).update(fields).eq('id', jobId).select().single()
  if (error) throw error
  return mapRow(data)
}

export async function updateJobBidsSupabase(jobId, bids) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ bids, updated_at: new Date().toISOString() })
    .eq('id', jobId)
    .select()
    .single()
  if (error) throw error
  return mapRow(data)
}

export async function computeJobRequestsStatsSupabase() {
  const { data, error } = await supabase.from(TABLE).select('status, budget')
  if (error) throw error
  const stats = { open:0, assigned:0, completed:0, cancelled:0, totalBudget:0 }
  for (const r of data||[]) {
    if (stats[r.status] !== undefined) stats[r.status]++
    stats.totalBudget += Number(r.budget)||0
  }
  return stats
}

export async function deleteJobRequestSupabase(jobId) {
  if (!jobId) return
  const { error } = await supabase.from(TABLE).delete().eq('id', jobId)
  if (error) throw error
  return true
}

function mapRow(row) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    category: row.category,
    genres: row.genres||[],
    budget: row.budget,
    currency: row.currency,
    deadlineDate: row.deadline_date,
    revisionsExpected: row.revisions_expected,
    referenceUrls: row.reference_urls||[],
    status: row.status,
    bids: row.bids||[],
    assignedProviderId: row.assigned_provider_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

// Escrow helpers
export async function getJobEscrowSupabase(jobId) {
  if (!jobId) return { paid: false, released: false }
  const { data, error } = await supabase.from(ESCROW_TABLE).select('*').eq('job_id', jobId).maybeSingle()
  if (error) throw error
  if (!data) return { paid: false, released: false }
  return { paid: !!data.funded, released: !!data.released, amount: Number(data.amount||0), currency: data.currency||'USD', updatedAt: data.updated_at }
}

export async function markJobPaidSupabase(jobId, amount=0, currency='USD', actorId=null) {
  if (!jobId) return { paid: false, released: false }
  const payload = { job_id: jobId, funded: true, released: false, amount: Number(amount)||0, currency, updated_at: new Date().toISOString() }
  const { data, error } = await supabase
    .from(ESCROW_TABLE)
    .upsert(payload, { onConflict: 'job_id' })
    .select()
    .single()
  if (error) throw error
  try {
    await supabase.from('job_escrow_audit').insert({ job_id: jobId, action: 'fund', amount: Number(amount)||0, currency, actor_id: actorId, created_at: new Date().toISOString() })
  } catch {}
  return { paid: !!data.funded, released: !!data.released, amount: Number(data.amount||0), currency: data.currency||'USD', updatedAt: data.updated_at }
}

export async function releaseJobFundsSupabase(jobId, actorId=null) {
  if (!jobId) return { paid: false, released: false }
  const { data, error } = await supabase
    .from(ESCROW_TABLE)
    .update({ released: true, updated_at: new Date().toISOString() })
    .eq('job_id', jobId)
    .select()
    .single()
  if (error) throw error
  try {
    await supabase.from('job_escrow_audit').insert({ job_id: jobId, action: 'release', amount: Number(data.amount||0), currency: data.currency||'USD', actor_id: actorId, created_at: new Date().toISOString() })
  } catch {}
  return { paid: !!data.funded, released: !!data.released, amount: Number(data.amount||0), currency: data.currency||'USD', updatedAt: data.updated_at }
}
