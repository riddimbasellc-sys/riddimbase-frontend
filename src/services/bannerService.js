// Banner service for homepage hero/banner replacement (localStorage backed)
// Banner: { id, dataUrl, active, createdAt, kind?: 'image'|'video', contentType?: string }
const KEY = 'rb_banners'
function load() { try { const raw = localStorage.getItem(KEY); if (!raw) return []; const arr = JSON.parse(raw); return Array.isArray(arr)?arr:[] } catch { return [] } }
function save(list) { try { localStorage.setItem(KEY, JSON.stringify(list)) } catch {} }
export function listBanners() { return load() }
export async function uploadBanner(file) {
  if (!file) return null
  const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file) })
  const list = load()
  const id = 'b_' + Date.now()
  const mime = file.type || ''
  const kind = mime.startsWith('video') ? 'video' : 'image'
  const banner = { id, dataUrl, active: false, createdAt: Date.now(), kind, contentType: mime }
  list.push(banner)
  save(list)
  return banner
}
export function setActiveBanner(id) { const list = load(); list.forEach(b=>b.active = (b.id===id)); save(list) }
export function deleteBanner(id) { const list = load().filter(b=>b.id!==id); save(list) }
export function getActiveBanner() { return load().find(b=>b.active) || null }
