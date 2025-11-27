import supabase from '../lib/supabaseClient'

// Table: service_orders
// Columns: id (uuid PK), provider_id uuid, service_name text, price numeric, buyer_name text, buyer_email text,
// status text, created_at timestamptz default now(), updated_at timestamptz default now()
// Index suggestions: provider_id + status, created_at desc

function handleError(ctx, error) {
  if (error) console.warn(`[serviceOrdersRepo] ${ctx} error`, error.message || error)
}

export async function createServiceOrderSupabase({ providerId, serviceName, price, buyerName, buyerEmail }) {
  try {
    const payload = {
      provider_id: providerId,
      service_name: serviceName,
      price,
      buyer_name: buyerName || '',
      buyer_email: buyerEmail || '',
      status: 'pending'
    }
    const { data, error } = await supabase.from('service_orders').insert(payload).select().single()
    if (error) { handleError('create', error); return null }
    return mapRow(data)
  } catch (e) {
    handleError('create.catch', e)
    return null
  }
}

export async function updateServiceOrderStatusSupabase(orderId, status) {
  try {
    const { data, error } = await supabase.from('service_orders').update({ status, updated_at: new Date().toISOString() }).eq('id', orderId).select().single()
    if (error) { handleError('update', error); return null }
    return mapRow(data)
  } catch (e) { handleError('update.catch', e); return null }
}

export async function listServiceOrdersSupabase({ providerId, status, search, page=1, pageSize=10 }) {
  try {
    let q = supabase.from('service_orders').select('*', { count: 'exact' }).eq('provider_id', providerId)
    if (status && status !== 'all') q = q.eq('status', status)
    if (search) {
      // Simple OR search on service_name & buyer_email
      q = q.or(`service_name.ilike.%${search}%,buyer_email.ilike.%${search}%`)
    }
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    q = q.order('created_at', { ascending: false }).range(from, to)
    const { data, error, count } = await q
    if (error) { handleError('list', error); return { data: [], count: 0 } }
    return { data: (data||[]).map(mapRow), count: count || 0 }
  } catch (e) {
    handleError('list.catch', e)
    return { data: [], count: 0 }
  }
}

export async function computeServiceOrdersStatsSupabase(providerId) {
  const { data } = await listServiceOrdersSupabase({ providerId, status: 'all', page:1, pageSize:1000 })
  const pending = data.filter(o=>o.status==='pending').length
  const open = data.filter(o=>o.status==='open').length
  const completed = data.filter(o=>o.status==='completed').length
  const cancelled = data.filter(o=>o.status==='cancelled').length
  const revenue = data.filter(o=>o.status==='completed').reduce((sum,o)=> sum + o.price, 0)
  const totalHandled = open + completed + cancelled
  const completionRate = totalHandled ? completed / totalHandled : 0
  return { pending, open, completed, cancelled, revenue, completionRate }
}

function mapRow(r) {
  return {
    id: r.id,
    providerId: r.provider_id,
    serviceName: r.service_name,
    price: Number(r.price || 0),
    buyerName: r.buyer_name,
    buyerEmail: r.buyer_email,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }
}

export async function searchServiceOrdersSupabase(params) {
  return listServiceOrdersSupabase(params)
}
