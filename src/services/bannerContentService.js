// Banner content (text + styling) stored locally for prototype
const KEY = 'rb_banner_content'

const defaultContent = {
  headline: 'Platform Spotlight',
  headlineBold: true,
  headlineItalic: false,
  headlineSize: 'text-2xl',
  headlineFont: 'font-display',
  body: 'Discover authentic Caribbean production. Browse fresh beats & riddims uploaded daily by emerging producers.',
  bodyBold: false,
  bodyItalic: false,
  bodySize: 'text-sm',
  bodyFont: 'font-sans'
}

function load() {
  try { const raw = localStorage.getItem(KEY); if (!raw) return defaultContent; const obj = JSON.parse(raw); return { ...defaultContent, ...obj } } catch { return defaultContent }
}
function save(data) { try { localStorage.setItem(KEY, JSON.stringify(data)) } catch {} }

export function getBannerContent() { return load() }
export function setBannerContent(patch) { const current = load(); const updated = { ...current, ...patch }; save(updated); return updated }
export function resetBannerContent() { save(defaultContent); return defaultContent }
