import { supabase } from '../lib/supabaseClient'

const LICENSES_TABLE = 'licenses'
const BEAT_LICENSES_TABLE = 'beat_licenses'

export async function listProducerLicenses(producerId) {
  if (!producerId) return []
  const { data, error } = await supabase
    .from(LICENSES_TABLE)
    .select('*')
    .eq('producer_id', producerId)
    .order('created_at', { ascending: false })
  if (error) {
    console.warn('[licenseService] listProducerLicenses error', error.message)
    return []
  }
  return data || []
}

export async function createLicense({
  producerId,
  name,
  price,
  isExclusive = false,
  streamsAllowed = null,
  downloadsAllowed = null,
  distributionAllowed = true,
  radioAllowed = false,
  musicVideoAllowed = false,
  stemsIncluded = false,
  ownershipTransfer = false,
  notes = '',
}) {
  if (!producerId) throw new Error('Missing producerId')
  const payload = {
    producer_id: producerId,
    name: name?.trim() || 'New License',
    price: Number(price || 0),
    is_exclusive: !!isExclusive,
    streams_allowed: streamsAllowed != null && streamsAllowed !== '' ? Number(streamsAllowed) : null,
    downloads_allowed: downloadsAllowed != null && downloadsAllowed !== '' ? Number(downloadsAllowed) : null,
    distribution_allowed: !!distributionAllowed,
    radio_allowed: !!radioAllowed,
    music_video_allowed: !!musicVideoAllowed,
    stems_included: !!stemsIncluded,
    ownership_transfer: !!ownershipTransfer,
    notes: notes || null,
  }
  const { data, error } = await supabase
    .from(LICENSES_TABLE)
    .insert(payload)
    .select('*')
    .single()
  if (error) {
    console.warn('[licenseService] createLicense error', error.message)
    throw new Error(error.message)
  }
  return data
}

export async function updateLicense(id, producerId, patch) {
  if (!id || !producerId) throw new Error('Missing id or producerId')
  const formatted = {}
  if (patch.name !== undefined) formatted.name = patch.name?.trim() || 'License'
  if (patch.price !== undefined) formatted.price = Number(patch.price || 0)
  if (patch.is_exclusive !== undefined) formatted.is_exclusive = !!patch.is_exclusive
  if (patch.streams_allowed !== undefined) {
    formatted.streams_allowed =
      patch.streams_allowed != null && patch.streams_allowed !== ''
        ? Number(patch.streams_allowed)
        : null
  }
  if (patch.downloads_allowed !== undefined) {
    formatted.downloads_allowed =
      patch.downloads_allowed != null && patch.downloads_allowed !== ''
        ? Number(patch.downloads_allowed)
        : null
  }
  if (patch.distribution_allowed !== undefined)
    formatted.distribution_allowed = !!patch.distribution_allowed
  if (patch.radio_allowed !== undefined) formatted.radio_allowed = !!patch.radio_allowed
  if (patch.music_video_allowed !== undefined)
    formatted.music_video_allowed = !!patch.music_video_allowed
  if (patch.stems_included !== undefined)
    formatted.stems_included = !!patch.stems_included
  if (patch.ownership_transfer !== undefined)
    formatted.ownership_transfer = !!patch.ownership_transfer
  if (patch.notes !== undefined) formatted.notes = patch.notes || null

  const { data, error } = await supabase
    .from(LICENSES_TABLE)
    .update(formatted)
    .eq('id', id)
    .eq('producer_id', producerId)
    .select('*')
    .single()
  if (error) {
    console.warn('[licenseService] updateLicense error', error.message)
    throw new Error(error.message)
  }
  return data
}

export async function deleteLicense(id, producerId) {
  if (!id || !producerId) throw new Error('Missing id or producerId')
  const { error } = await supabase
    .from(LICENSES_TABLE)
    .delete()
    .eq('id', id)
    .eq('producer_id', producerId)
  if (error) {
    console.warn('[licenseService] deleteLicense error', error.message)
    throw new Error(error.message)
  }
  return true
}

export async function listLicensesForBeat(beatId) {
  if (!beatId) return []
  const { data, error } = await supabase
    .from(BEAT_LICENSES_TABLE)
    .select('id, license:licenses(*)')
    .eq('beat_id', beatId)
  if (error) {
    console.warn('[licenseService] listLicensesForBeat error', error.message)
    return []
  }
  const rows = data || []
  return rows
    .map((row) => row.license)
    .filter(Boolean)
}

export async function setBeatLicenses(beatId, licenseIds) {
  if (!beatId) throw new Error('Missing beatId')
  const ids = Array.isArray(licenseIds)
    ? Array.from(new Set(licenseIds.filter(Boolean)))
    : []

  // Clear existing
  const { error: delError } = await supabase
    .from(BEAT_LICENSES_TABLE)
    .delete()
    .eq('beat_id', beatId)
  if (delError) {
    console.warn('[licenseService] setBeatLicenses delete error', delError.message)
  }

  if (!ids.length) return []
  const payload = ids.map((id) => ({ beat_id: beatId, license_id: id }))
  const { data, error } = await supabase
    .from(BEAT_LICENSES_TABLE)
    .insert(payload)
    .select('id, license:licenses(*)')
  if (error) {
    console.warn('[licenseService] setBeatLicenses insert error', error.message)
    throw new Error(error.message)
  }
  return (data || []).map((row) => row.license).filter(Boolean)
}
