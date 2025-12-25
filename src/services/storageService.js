// AWS S3 based upload service using backend presigned URLs.
// Expects backend endpoint /api/upload-url providing { uploadUrl, key, publicUrl }.
// Set folders to segregate content types similar to previous buckets.

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

async function getPresigned(file, folder) {
  const endpoint = API_BASE ? `${API_BASE}/api/upload-url` : '/api/upload-url'
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, contentType: file.type || 'application/octet-stream', folder })
  })
  if (!res.ok) {
    let detail = ''
    try {
      const text = await res.text()
      detail = text?.slice(0, 300) || ''
    } catch {}
    throw new Error('Failed to obtain upload URL' + (detail ? `: ${detail}` : ''))
  }
  return res.json()
}

async function putFile(uploadUrl, file) {
  const put = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file
  })
  if (!put.ok) {
    let detail = ''
    try { detail = (await put.text())?.slice(0, 300) } catch {}
    throw new Error('Upload failed' + (detail ? `: ${detail}` : ''))
  }
}

async function uploadToFolder(folder, file) {
  if (!file) throw new Error('No file provided')
  const { uploadUrl, publicUrl, key } = await getPresigned(file, folder)
  await putFile(uploadUrl, file)
  return { key, publicUrl }
}

export async function uploadArtwork(file) { return uploadToFolder('artwork', file) }
export async function uploadAudio(file) { return uploadToFolder('audio', file) }
export async function uploadBundle(file) { return uploadToFolder('bundles', file) }
export async function uploadAvatar(file) { return uploadToFolder('avatars', file) }
export async function uploadTestimonialMedia(file) { return uploadToFolder('testimonials', file) }
export async function uploadHeroBackground(file) { return uploadToFolder('hero', file) }
export async function uploadChatAttachment(file) { return uploadToFolder('chat', file) }
export async function uploadFeedAttachment(file) { return uploadToFolder('feed', file) }

// New helper: upload beat audio + metadata via backend /beats/upload-beat
export async function uploadBeatWithMetadata({
  file,
  userId,
  title,
  genre,
  bpm,
  description,
  price,
  coverUrl,
  producerName,
  collaborator,
  musicalKey,
  freeDownload,
}) {
  if (!file) throw new Error('No audio file provided')
  const base = API_BASE || ''
  const endpoint = `${base}/beats/upload-beat`
  const form = new FormData()
  form.append('file', file)
  if (userId) form.append('user_id', userId)
  if (title) form.append('title', title)
  if (genre) form.append('genre', genre)
  if (bpm !== undefined && bpm !== null && bpm !== '') form.append('bpm', String(bpm))
  if (description) form.append('description', description)
  if (price !== undefined && price !== null && price !== '') form.append('price', String(price))
  if (coverUrl) form.append('cover_url', coverUrl)
  if (producerName) form.append('producer', producerName)
  if (collaborator) form.append('collaborator', collaborator)
  if (musicalKey) form.append('musical_key', musicalKey)
  if (typeof freeDownload === 'boolean') {
    form.append('free_download', freeDownload ? 'true' : 'false')
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    body: form
  })

  let payload = null
  try {
    payload = await res.json()
  } catch {
    // ignore
  }

  if (!res.ok) {
    const msg = payload?.error || 'Failed to upload beat'
    throw new Error(msg)
  }

  const beat = payload?.beat || null
  const audioUrl = beat?.audio_url || null
  return { beat, audioUrl }
}
