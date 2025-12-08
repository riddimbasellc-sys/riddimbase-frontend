import { supabase } from '../lib/supabaseClient'

const TABLE = 'testimonials'

export async function fetchTestimonials() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('published', true)
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('[testimonialsService] fetchTestimonials error', error.message)
    return []
  }
  return data || []
}

export async function fetchAllTestimonials() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('[testimonialsService] fetchAllTestimonials error', error.message)
    return []
  }
  return data || []
}

export async function upsertTestimonial(payload) {
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single()

  if (error) {
    console.warn('[testimonialsService] upsertTestimonial error', error.message)
    throw error
  }
  return data
}

export async function deleteTestimonial(id) {
  if (!id) return
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) {
    console.warn('[testimonialsService] deleteTestimonial error', error.message)
    throw error
  }
}

