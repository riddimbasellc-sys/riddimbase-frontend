import { supabase } from '../lib/supabaseClient'

// Fetch daily metrics for a producer between dates (inclusive).
// metric: 'plays' | 'followers' | 'likes' | 'sales'
export async function fetchProducerMetrics({ producerId, metric, from, to }) {
  if (!producerId || !metric || !from || !to) return []
  try {
    const { data, error } = await supabase
      .from('producer_metrics_daily')
      .select('day,value')
      .eq('producer_id', producerId)
      .eq('metric', metric)
      .gte('day', from)
      .lte('day', to)
      .order('day', { ascending: true })
    if (error) throw error
    return (data || []).map((row) => ({
      day: row.day,
      value: row.value || 0,
    }))
  } catch {
    return []
  }
}

