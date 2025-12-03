// Legacy in-memory provider helpers kept only for compatibility.
// All real provider data now comes from Supabase (see supabaseProvidersRepository).

export function listProviders() {
  return []
}

export function getProvider() {
  return null
}

export function addProviderBeat() {
  return { error: 'Not supported in legacy service' }
}

export function upsertUserProvider() {
  return null
}

export function updateUserProviderContacts() {
  return null
}

export function updateUserProviderServices() {
  return null
}

export function removeProviderCatalogItem() {
  return { error: 'Not supported in legacy service' }
}

export function userProviderCatalogRemaining() {
  return 0
}
