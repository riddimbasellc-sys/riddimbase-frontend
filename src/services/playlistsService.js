// Lightweight playlist store for prototype use (in-memory + localStorage sync)
let playlists = [
  {
    id: 'pl-1',
    title: 'Dancehall Heatwave',
    description: 'Club-ready bashment riddims & hooks to light up any set.',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=900&q=80',
    moods: ['Hype', 'Dancehall', 'Party'],
    beatIds: ['1', '2'],
    likes: 22,
    favorites: 14,
    plays: 180,
    comments: [
      { id: 'c1', user: '@selector', text: 'Perfect for my mixtape!', createdAt: Date.now() - 3600000 },
    ],
    likedBy: [],
    favoritedBy: [],
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: 'pl-2',
    title: 'Chill Soca Sunset',
    description: 'Laid-back grooves and island soul for storytelling records.',
    coverUrl: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?auto=format&fit=crop&w=900&q=80',
    moods: ['Chill', 'Soca', 'Mood'],
    beatIds: ['3', '4'],
    likes: 9,
    favorites: 6,
    plays: 95,
    comments: [],
    likedBy: [],
    favoritedBy: [],
    createdAt: Date.now() - 86400000 * 5,
  },
]

const hasStorage = () => typeof localStorage !== 'undefined'

const persist = () => {
  if (!hasStorage()) return
  try { localStorage.setItem('rb_playlists', JSON.stringify(playlists)) } catch {}
}

const load = () => {
  if (!hasStorage()) return
  try {
    const stored = localStorage.getItem('rb_playlists')
    if (stored) playlists = JSON.parse(stored)
  } catch {}
}

load()

export function listPlaylists() {
  return playlists.slice().sort((a, b) => b.createdAt - a.createdAt)
}

export function getPlaylist(id) {
  return playlists.find(p => p.id === id) || null
}

export function createPlaylist(data) {
  const id = 'pl-' + Date.now()
  const item = {
    id,
    title: data.title || 'Untitled Playlist',
    description: data.description || '',
    coverUrl: data.coverUrl || '',
    moods: data.moods || [],
    beatIds: data.beatIds || [],
    likes: 0,
    favorites: 0,
    plays: 0,
    comments: [],
    likedBy: [],
    favoritedBy: [],
    createdAt: Date.now(),
  }
  playlists.unshift(item)
  persist()
  return item
}

export function updatePlaylist(id, patch) {
  const idx = playlists.findIndex(p => p.id === id)
  if (idx === -1) return null
  playlists[idx] = { ...playlists[idx], ...patch }
  persist()
  return playlists[idx]
}

export function deletePlaylist(id) {
  const before = playlists.length
  playlists = playlists.filter(p => p.id !== id)
  persist()
  return playlists.length < before
}

export function togglePlaylistLike(id, userId='guest') {
  const p = getPlaylist(id)
  if (!p) return null
  const has = p.likedBy?.includes(userId)
  p.likedBy = p.likedBy || []
  p.likes = p.likes || 0
  if (has) {
    p.likedBy = p.likedBy.filter(x => x !== userId)
    p.likes = Math.max(0, p.likes - 1)
  } else {
    p.likedBy.push(userId)
    p.likes += 1
  }
  persist()
  return { ...p }
}

export function togglePlaylistFavorite(id, userId='guest') {
  const p = getPlaylist(id)
  if (!p) return null
  const has = p.favoritedBy?.includes(userId)
  p.favoritedBy = p.favoritedBy || []
  p.favorites = p.favorites || 0
  if (has) {
    p.favoritedBy = p.favoritedBy.filter(x => x !== userId)
    p.favorites = Math.max(0, p.favorites - 1)
  } else {
    p.favoritedBy.push(userId)
    p.favorites += 1
  }
  persist()
  return { ...p }
}

export function addCommentToPlaylist(id, { user='Listener', text }) {
  const p = getPlaylist(id)
  if (!p || !text) return null
  const comment = { id: 'c-' + Date.now(), user, text, createdAt: Date.now() }
  p.comments = p.comments || []
  p.comments.unshift(comment)
  persist()
  return comment
}

export function recordPlaylistPlay(id) {
  const p = getPlaylist(id)
  if (!p) return null
  p.plays = (p.plays || 0) + 1
  persist()
  return p.plays
}

export function getTrendingPlaylists(limit=6) {
  const scored = playlists.map(p => ({ ...p, score: computeScore(p) }))
  return scored.sort((a,b)=> b.score - a.score).slice(0, limit)
}

export function computeScore(p) {
  const plays = p.plays || 0
  const likes = p.likes || 0
  const favs = p.favorites || 0
  const comments = (p.comments || []).length
  return plays + likes * 2 + favs * 1.5 + comments * 1.2
}
