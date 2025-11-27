import { supabase } from '../lib/supabaseClient'

// Fetch daily admin series for a given metric across the whole platform.
// metric: 'plays' | 'followers' | 'likes' | 'sales' | 'subscriptions'
export async function fetchAdminSeries({ metric, from, to }) {
  if (!metric || !from || !to) return []
  try {
    if (metric === 'subscriptions') {
      return fetchSubscriptionsSeries({ from, to })
    }
    return fetchProducerMetricSeries({ metric, from, to })
  } catch {
    return []
  }
}

async function fetchProducerMetricSeries({ metric, from, to }) {
  const { data, error } = await supabase
    .from('producer_metrics_daily')
    .select('day,value')
    .eq('metric', metric)
    .gte('day', from)
    .lte('day', to)
    .order('day', { ascending: true })
  if (error) throw error
  const map = new Map()
  ;(data || []).forEach((row) => {
    const day = row.day
    const val = row.value || 0
    map.set(day, (map.get(day) || 0) + val)
  })
  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([day, value]) => ({ day, value }))
}

async function fetchSubscriptionsSeries({ from, to }) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('started_at')
    .gte('started_at', from)
    .lte('started_at', to)
  if (error) throw error
  const map = new Map()
  ;(data || []).forEach((row) => {
    const d = row.started_at && row.started_at.slice(0, 10)
    if (!d) return
    map.set(d, (map.get(d) || 0) + 1)
  })
  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([day, value]) => ({ day, value }))
}

