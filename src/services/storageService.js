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
