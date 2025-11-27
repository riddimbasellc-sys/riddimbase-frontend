import { supabase } from '../lib/supabaseClient'

const TABLE = 'sales'

// Expected schema:
// id: uuid (primary key)
// beat_id: text
// license: text
// buyer: text
// amount: numeric
// created_at: timestamptz default now()

export async function fetchSales() {
  const { data, error } = await supabase.from(TABLE).select('*').order('created_at', { ascending: false })
  if (error) { console.warn('[salesRepository] fetchSales error', error.message); return [] }
  return data || []
}

export async function createSale({ beatId, license, buyer, amount }) {
  const payload = { beat_id: beatId, license, buyer, amount }
  const { data, error } = await supabase.from(TABLE).insert(payload).select().single()
  if (error) { console.warn('[salesRepository] createSale error', error.message); return null }
  return data
}

export function computeMonthlyMetrics(sales) {
  const now = new Date()
  const monthSales = sales.filter(s => {
    const d = new Date(s.created_at)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })
  const monthlyRevenue = monthSales.reduce((sum, s) => sum + (s.amount || 0), 0)
  return { monthSalesCount: monthSales.length, monthlyRevenue }
}
