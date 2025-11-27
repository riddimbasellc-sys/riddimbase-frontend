// In-memory service provider store. Replace with Supabase tables later.
// Catalog items limited to 3 per provider.

const providers = [
  {
    id: 'marley-prodx',
    name: 'Marley ProDx',
    avatar: null,
    location: 'Kingston, JM',
    tags: ['Mix & Master', 'Custom Beats', 'Studio Session'],
    bio: 'Specializing in modern dancehall & afrobeats fusion with a clean, punchy mix aesthetic.',
    contact: { email: 'marley@example.com' },
    services: [
      { name: 'Mix & Master (per track)', price: 80 },
      { name: 'Custom Beat (non-exclusive)', price: 150 },
      { name: 'Full Studio Session (4h)', price: 200 }
    ],
    catalog: [
      { id: 'mpx1', title: 'Island Sunset', audioUrl: null, coverUrl: null },
      { id: 'mpx2', title: 'Midnight Cruise', audioUrl: null, coverUrl: null }
    ]
  },
  {
    id: 'soca-wave-lab',
    name: 'Soca Wave Lab',
    avatar: null,
    location: 'Port of Spain, TT',
    tags: ['Custom Beats', 'Vocal Production'],
    bio: 'Energetic soca & crossover riddims tailored for carnival season releases.',
    contact: { email: 'wave@example.com' },
    services: [
      { name: 'Custom Soca Riddim', price: 300 },
      { name: 'Vocal Production (per song)', price: 120 }
    ],
    catalog: [
      { id: 'swl1', title: 'Carnival Rise', audioUrl: null, coverUrl: null }
    ]
  },
  {
    id: 'dub-tech-studio',
    name: 'Dub Tech Studio',
    avatar: null,
    location: 'London, UK',
    tags: ['Mix & Master', 'Stem Cleanup'],
    bio: 'Hybrid dub / experimental textures with precise low-end management.',
    contact: { email: 'dubtech@example.com' },
    services: [
      { name: 'Stem Cleanup (up to 20)', price: 110 },
      { name: 'Full Mix & Master', price: 140 }
    ],
    catalog: []
  }
]

// User-managed providers keyed by userId (temporary in-memory until Supabase integration)
const userProviders = new Map()

function ensureUserProvider(user) {
  if (!user || !user.id) return null
  if (!userProviders.has(user.id)) {
    userProviders.set(user.id, {
      id: user.id,
      name: user.email?.split('@')[0] || 'Unknown',
      avatar: null,
      location: '',
      tags: [],
      bio: '',
      contact: { email: user.email, instagram: '', whatsapp: '', telegram: '', phone: '' },
      services: [],
      catalog: []
    })
  }
  return userProviders.get(user.id)
}

export function listProviders() {
  return [...providers, ...Array.from(userProviders.values())]
}

export function getProvider(id) {
  return providers.find(p => p.id === id) || userProviders.get(id) || null
}

export function addProviderBeat(providerId, beat) {
  const p = getProvider(providerId)
  if (!p) return { error: 'Provider not found' }
  if (p.catalog.length >= 3) return { error: 'Catalog limit reached (3)' }
  const id = `${providerId}-${Date.now()}`
  const item = { id, title: beat.title, audioUrl: beat.audioUrl || null, coverUrl: beat.coverUrl || null }
  p.catalog.push(item)
  return { data: item }
}

export function upsertUserProvider(user, patch) {
  const base = ensureUserProvider(user)
  if (!base) return null
  Object.assign(base, patch)
  return base
}

export function updateUserProviderContacts(user, contacts) {
  const base = ensureUserProvider(user)
  if (!base) return null
  base.contact = { ...base.contact, ...contacts }
  return base
}

export function updateUserProviderServices(user, services) {
  const base = ensureUserProvider(user)
  if (!base) return null
  base.services = services.slice()
  return base
}

export function removeProviderCatalogItem(providerId, itemId) {
  const p = getProvider(providerId)
  if (!p) return { error: 'Provider not found' }
  p.catalog = p.catalog.filter(i => i.id !== itemId)
  return { data: true }
}

export function userProviderCatalogRemaining(providerId) {
  const p = getProvider(providerId)
  if (!p) return 0
  return Math.max(0, 3 - p.catalog.length)
}
