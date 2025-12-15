import { fetchSales, createSale, computeMonthlyMetrics } from './salesRepository'
import { sendSaleEmail } from './notificationService'
import { addNotification } from './notificationsRepository'
import { fetchBeat as fetchBeatRemote } from './beatsRepository'
import { supabase } from '../lib/supabaseClient'

// ---------------------------------------------------------------------------
// Beat helpers (thin Supabase-backed utilities)
// ---------------------------------------------------------------------------

export async function listBeats({ includeHidden = false } = {}) {
  const query = supabase
    .from('beats')
    .select('*')
    .order('created_at', { ascending: false })
  if (!includeHidden) {
    query.eq('hidden', false)
  }
  const { data, error } = await query
  if (error) {
    console.warn('[beatsService] listBeats error', error.message)
    return []
  }
  return data || []
}

export async function getBeat(id) {
  if (!id) return null
  return fetchBeatRemote(id)
}

// ---------------------------------------------------------------------------
// Sales helpers (Supabase only)
// ---------------------------------------------------------------------------

export async function listSales() {
  // Kept for backwards compatibility; same shape as listSalesAsync
  return listSalesAsync()
}

export async function listSalesAsync() {
  try {
    const rows = await fetchSales()
    return (rows || []).map((r) => ({
      beatId: r.beat_id,
      license: r.license,
      buyer: r.buyer,
      amount: r.amount,
      createdAt: r.created_at,
    }))
  } catch (e) {
    console.warn('[beatsService] listSalesAsync error', e?.message)
    return []
  }
}

export async function totalEarnings() {
  const sales = await listSalesAsync()
  return sales.reduce((sum, s) => sum + (s.amount || 0), 0)
}

export async function recordSale({ beatId, license, buyer, amount, beatTitle }) {
  const saleRow = await createSale({ beatId, license, buyer, amount })

  if (import.meta.env.VITE_NOTIFICATIONS_ENABLED === 'true') {
    try {
      await sendSaleEmail({
        beatTitle: beatTitle || beatId,
        license,
        buyerEmail: buyer,
        amount,
      })
    } catch (e) {
      console.warn('[beatsService] sendSaleEmail failed', e?.message)
    }
  }

  // Fire producer sale notification (if beat + producer known)
  try {
    const beat = await fetchBeatRemote(beatId)
    const producerId = beat?.user_id || beat?.userId || null
    if (producerId) {
      await addNotification({
        recipientId: producerId,
        actorId: null,
        type: 'sale',
        data: {
          beatTitle: beatTitle || beat?.title || String(beatId),
          amount,
          currency: 'USD',
        },
      })
    }
  } catch (e) {
    console.warn('[beatsService] addNotification failed', e?.message)
  }

  return saleRow
}

export async function monthlySalesCount() {
  const sales = await fetchSales()
  const { monthSalesCount } = computeMonthlyMetrics(sales || [])
  return monthSalesCount
}

export async function monthlyRevenue() {
  const sales = await fetchSales()
  const { monthlyRevenue } = computeMonthlyMetrics(sales || [])
  return monthlyRevenue
}

// Compute gross earnings for a producer by userId or displayName
export async function computeProducerEarnings({ userId, displayName }) {
  if (!userId && !displayName) return 0
  try {
    const sales = await fetchSales()
    if (!sales || !sales.length) return 0

    const beatIds = Array.from(new Set(sales.map((s) => s.beat_id).filter(Boolean)))
    if (!beatIds.length) return 0

    const { data: beats, error } = await supabase
      .from('beats')
      .select('id, user_id, producer')
      .in('id', beatIds)

    if (error) {
      console.warn('[beatsService] computeProducerEarnings beats error', error.message)
      return 0
    }

    const byId = new Map((beats || []).map((b) => [b.id, b]))

    return sales.reduce((sum, s) => {
      const beat = byId.get(s.beat_id)
      if (!beat) return sum
      if (userId && beat.user_id === userId) return sum + (s.amount || 0)
      if (displayName && beat.producer === displayName) return sum + (s.amount || 0)
      return sum
    }, 0)
  } catch (e) {
    console.warn('[beatsService] computeProducerEarnings unexpected error', e?.message)
    return 0
  }
}

// ---------------------------------------------------------------------------
// Moderation helpers
// ---------------------------------------------------------------------------

export async function hideBeat(id) {
  if (!id) return null
  const { data, error } = await supabase
    .from('beats')
    .update({ hidden: true })
    .eq('id', id)
    .select()
    .maybeSingle()
  if (error) {
    console.warn('[beatsService] hideBeat error', error.message)
    return null
  }
  return data
}

export async function deleteBeat(id) {
  if (!id) return false
  const { error } = await supabase.from('beats').delete().eq('id', id)
  if (error) {
    console.warn('[beatsService] deleteBeat error', error.message)
    return false
  }
  return true
}

export async function flagProducer(id) {
  // Placeholder: if you want a "flagged" status on beats, update the beat row
  // or create a dedicated moderation table. For now, mark beat as flagged.
  if (!id) return null
  const { data, error } = await supabase
    .from('beats')
    .update({ flagged: true })
    .eq('id', id)
    .select()
    .maybeSingle()
  if (error) {
    console.warn('[beatsService] flagProducer error', error.message)
    return null
  }
  return data
}
