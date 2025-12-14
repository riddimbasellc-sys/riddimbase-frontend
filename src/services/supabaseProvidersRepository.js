// Supabase repository for provider profiles & catalog.
// Expected schema (adjust as needed):
// Table: provider_profiles ->
//   id (uuid, PK),
//   display_name text,
//   avatar_url text,
//   bio text,
//   location text,
//   tags text,
//   contact_email text,
//   contact_phone text,
//   instagram text,
//   whatsapp text,
//   telegram text,
//   services text/json,
//   updated_at timestamp
// Table: provider_catalog -> id uuid PK, provider_id uuid FK, title text, audio_url text, cover_url text, ord int
// If tables do not exist, functions will fail silently and return null/[] so UI can fallback.
import { supabase } from '../lib/supabaseClient'

const PROFILES = 'provider_profiles'
const CATALOG = 'provider_catalog'

function handleError(ctx, error) {
  if (!error) return
  // PostgREST table not found codes may vary; we just warn.
  console.warn(`[providersRepo] ${ctx} error`, error.message)
}

export async function fetchProviderProfile(userId) {
  if (!userId) return null
  const { data, error } = await supabase.from(PROFILES).select('*').eq('id', userId).single()
  if (error) { handleError('fetchProfile', error); return null }
  // Parse services if present
  if (data?.services && typeof data.services === 'string') {
    try { data.services = JSON.parse(data.services) } catch { /* ignore parse errors */ }
  }
  return data
}

export async function upsertProviderProfile(userId, patch) {
  if (!userId) return null
  const payload = { id: userId, ...patch }
  const { data, error } = await supabase.from(PROFILES).upsert(payload).select().single()
  if (error) { handleError('upsertProfile', error); return null }
  return data
}

export async function updateProviderServices(userId, services) {
  if (!userId) return null
  const payload = { id: userId, services: JSON.stringify(services || []) }
  const { data, error } = await supabase.from(PROFILES).upsert(payload).select().single()
  if (error) { handleError('updateProviderServices', error); return null }
  return data
}

export async function listProviderProfiles() {
  const { data, error } = await supabase.from(PROFILES).select('*')
  if (error) {
    handleError('listProviderProfiles', error)
    return []
  }
  const rows = data || []
  return rows.map((row) => {
    let services = row.services
    if (services && typeof services === 'string') {
      try {
        services = JSON.parse(services)
      } catch {
        services = []
      }
    }
    return { ...row, services }
  })
}

export async function fetchCatalog(userId) {
  if (!userId) return []
  const { data, error } = await supabase.from(CATALOG).select('*').eq('provider_id', userId).order('ord', { ascending: true })
  if (error) { handleError('fetchCatalog', error); return [] }
  return data || []
}

export async function addCatalogItem(userId, item) {
  if (!userId) return null
  // Determine next order
  const existing = await fetchCatalog(userId)
  const ord = existing.length
  const payload = { provider_id: userId, title: item.title, audio_url: item.audioUrl, cover_url: item.coverUrl || null, ord }
  const { data, error } = await supabase.from(CATALOG).insert(payload).select().single()
  if (error) { handleError('addCatalogItem', error); return null }
  return data
}

export async function removeCatalogItem(itemId) {
  if (!itemId) return false
  const { error } = await supabase.from(CATALOG).delete().eq('id', itemId)
  if (error) { handleError('removeCatalogItem', error); return false }
  return true
}

export async function reorderCatalog(userId, orderedIds) {
  if (!userId || !orderedIds?.length) return false
  // Batch updates: sequentially update ord.
  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i]
    const { error } = await supabase.from(CATALOG).update({ ord: i }).eq('id', id)
    if (error) { handleError('reorderCatalog', error); return false }
  }
  return true
}
