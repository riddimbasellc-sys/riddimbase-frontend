import { supabase } from '../lib/supabaseClient'
import useSupabaseUser from '../hooks/useSupabaseUser'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

async function fireProducerMetric({ producerId, metric, delta }) {
  if (!API_BASE || !producerId || !metric || !delta) return
  try {
    fetch(`${API_BASE}/api/metrics/producer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ producerId, metric, delta }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // ignore network issues
  }
}

// Helper to get current user id (non-hook usage inside events)
export const currentUserId = () => {
  const session = supabase.auth.getSession ? null : null
  // We rely on hooks in components; for service functions expect userId passed explicitly when needed.
  return null
}

// Likes
export async function toggleLike({ userId, beatId, producerId }) {
  if (!userId || !beatId) return { success: false }
  const existing = await supabase
    .from('likes')
    .select('id')
    .eq('user_id', userId)
    .eq('beat_id', beatId)
    .maybeSingle()
  if (existing.data && existing.data.id) {
    await supabase.from('likes').delete().eq('id', existing.data.id)
    if (producerId) {
      fireProducerMetric({ producerId, metric: 'likes', delta: -1 })
    }
    return { liked: false }
  } else {
    await supabase.from('likes').insert({ user_id: userId, beat_id: beatId })
    if (producerId) {
      fireProducerMetric({ producerId, metric: 'likes', delta: 1 })
    }
    return { liked: true }
  }
}
export async function isLiked({ userId, beatId }) {
  if (!userId) return false
  const { data } = await supabase.from('likes').select('id').eq('user_id', userId).eq('beat_id', beatId).limit(1)
  return !!(data && data.length)
}
export async function likeCount(beatId) {
  const { count } = await supabase.from('likes').select('*', { count: 'exact', head: true }).eq('beat_id', beatId)
  return count || 0
}

// Favorites
export async function toggleFavorite({ userId, beatId }) {
  if (!userId || !beatId) return { success: false }
  const existing = await supabase.from('favorites').select('id').eq('user_id', userId).eq('beat_id', beatId).maybeSingle()
  if (existing.data && existing.data.id) {
    await supabase.from('favorites').delete().eq('id', existing.data.id)
    return { favorited: false }
  } else {
    await supabase.from('favorites').insert({ user_id: userId, beat_id: beatId })
    return { favorited: true }
  }
}
export async function isFavorited({ userId, beatId }) {
  if (!userId) return false
  const { data } = await supabase.from('favorites').select('id').eq('user_id', userId).eq('beat_id', beatId).limit(1)
  return !!(data && data.length)
}
export async function favoriteCount(beatId) {
  const { count } = await supabase.from('favorites').select('*', { count: 'exact', head: true }).eq('beat_id', beatId)
  return count || 0
}

// Follows (producer user id)
export async function toggleFollow({ followerId, producerId }) {
  if (!followerId || !producerId || followerId === producerId)
    return { success: false }
  const existing = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('producer_id', producerId)
    .maybeSingle()
  if (existing.data && existing.data.id) {
    await supabase.from('follows').delete().eq('id', existing.data.id)
    fireProducerMetric({ producerId, metric: 'followers', delta: -1 })
    return { following: false }
  } else {
    await supabase
      .from('follows')
      .insert({ follower_id: followerId, producer_id: producerId })
    fireProducerMetric({ producerId, metric: 'followers', delta: 1 })
    return { following: true }
  }
}
export async function isFollowing({ followerId, producerId }) {
  if (!followerId) return false
  const { data } = await supabase.from('follows').select('id').eq('follower_id', followerId).eq('producer_id', producerId).limit(1)
  return !!(data && data.length)
}
export async function followerCount(producerId) {
  const { count } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('producer_id', producerId)
  return count || 0
}

// Reposts (share beats into follower feeds)
export async function toggleRepost({ userId, beatId }) {
  if (!userId || !beatId) return { success: false }
  const existing = await supabase
    .from('reposts')
    .select('id')
    .eq('user_id', userId)
    .eq('beat_id', beatId)
    .maybeSingle()
  if (existing.data && existing.data.id) {
    await supabase.from('reposts').delete().eq('id', existing.data.id)
    return { reposted: false }
  } else {
    await supabase.from('reposts').insert({ user_id: userId, beat_id: beatId })
    return { reposted: true }
  }
}

export async function isReposted({ userId, beatId }) {
  if (!userId) return false
  const { data } = await supabase
    .from('reposts')
    .select('id')
    .eq('user_id', userId)
    .eq('beat_id', beatId)
    .limit(1)
  return !!(data && data.length)
}

export async function repostCount(beatId) {
  const { count } = await supabase
    .from('reposts')
    .select('*', { head: true, count: 'exact' })
    .eq('beat_id', beatId)
  return count || 0
}

// Messages
export async function sendMessage({ senderId, recipientId, content }) {
  if (!senderId || !recipientId || !content) return { success: false }

  // Enforce free-plan monthly message limits (20 messages / month)
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan_id')
      .eq('id', senderId)
      .maybeSingle()

    const planId = profile?.plan_id || 'free'
    const isFree = !planId || planId === 'free'

    if (isFree) {
      const now = new Date()
      const monthKey = `${now.getFullYear()}-${String(
        now.getMonth() + 1,
      ).padStart(2, '0')}`

      const { data: limitRow, error: limitErr } = await supabase
        .from('message_limits')
        .select('id,sent_count')
        .eq('user_id', senderId)
        .eq('month', monthKey)
        .maybeSingle()

      if (limitErr) {
        console.warn('[socialService] message_limits fetch error', limitErr.message)
      }

      const currentCount = limitRow?.sent_count || 0
      const maxFree = 20

      if (currentCount >= maxFree) {
        return {
          success: false,
          error:
            'Free plan messaging limit reached. Upgrade your plan for unlimited messages.',
          limitReached: true,
        }
      }

      const nextCount = currentCount + 1
      const payload = {
        user_id: senderId,
        month: monthKey,
        sent_count: nextCount,
        updated_at: new Date().toISOString(),
      }

      if (limitRow?.id) {
        await supabase
          .from('message_limits')
          .update(payload)
          .eq('id', limitRow.id)
      } else {
        await supabase.from('message_limits').insert(payload)
      }
    }
  } catch (e) {
    console.warn('[socialService] message limit check failed', e)
  }

  const { data, error } = await supabase.from('messages').insert({ sender_id: senderId, recipient_id: recipientId, content }).select().maybeSingle()
  if (error) return { success: false, error }
  return { success: true, message: data }
}
export async function fetchMessages({ userId, otherUserId, limit = 50 }) {
  if (!userId || !otherUserId) return []
  const { data } = await supabase
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(limit)
  // Filter to pair
  return (data || []).filter(m => (m.sender_id === userId && m.recipient_id === otherUserId) || (m.sender_id === otherUserId && m.recipient_id === userId)).reverse()
}

export function subscribeMessages({ userId, otherUserId, onMessage }) {
  const channel = supabase.channel('messages-feed')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
      const m = payload.new
      if (!m) return
      if (userId && otherUserId && ((m.sender_id === userId && m.recipient_id === otherUserId) || (m.sender_id === otherUserId && m.recipient_id === userId))) {
        onMessage && onMessage(m)
      }
    })
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}

// Unread count (requires optional read_at column on messages)
export async function unreadCount(userId) {
  if (!userId) return 0
  try {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { head: true, count: 'exact' })
      .eq('recipient_id', userId)
      .is('read_at', null)
    if (error) throw error
    return count || 0
  } catch {
    return 0
  }
}

export async function markThreadRead({ userId, otherUserId }) {
  if (!userId || !otherUserId) return { success:false }
  try {
    const { error } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('recipient_id', userId)
      .eq('sender_id', otherUserId)
      .is('read_at', null)
    if (error) throw error
    return { success:true }
  } catch {
    return { success:false }
  }
}

// Utility to fetch user by email (for chat recipient resolution)
export async function findUserByEmail(email) {
  if (!email) return null
  const { data } = await supabase
    .from('profiles')
    .select('id, email, display_name')
    .or(`email.ilike.%${email}%,display_name.ilike.%${email}%`)
    .limit(1)
  return data && data.length ? data[0] : null
}

// Recent threads for a user (distinct other participant with latest timestamp)
export async function fetchThreads({ userId, limit = 20 }) {
  if (!userId) return []
  const { data } = await supabase
    .from('messages')
    .select('id,sender_id,recipient_id,content,created_at')
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(200)
  const map = new Map()
  ;(data || []).forEach(m => {
    const otherId = m.sender_id === userId ? m.recipient_id : m.sender_id
    if (!map.has(otherId)) map.set(otherId, m)
  })
  const threads = Array.from(map.entries()).map(([otherUserId, last]) => ({ otherUserId, last }))
  threads.sort((a,b)=> new Date(b.last.created_at) - new Date(a.last.created_at))
  return threads.slice(0, limit)
}

export async function fetchProfilesByIds(ids = []) {
  if (!ids.length) return []
  const { data } = await supabase.from('profiles').select('id, display_name, email').in('id', ids)
  return data || []
}

// Beats reposted by people the user follows (for feed sections)
export async function fetchRepostedBeatIdsForUser(userId, { limit = 24 } = {}) {
  if (!userId) return []
  // Get producers this user follows
  const { data: followRows } = await supabase
    .from('follows')
    .select('producer_id')
    .eq('follower_id', userId)
  const producerIds = (followRows || []).map((r) => r.producer_id)
  if (!producerIds.length) return []

  const { data: repostRows } = await supabase
    .from('reposts')
    .select('beat_id, user_id, created_at')
    .in('user_id', producerIds)
    .order('created_at', { ascending: false })
    .limit(limit)

  return repostRows || []
}

// Bulk like/favorite counts for multiple beats
export async function fetchCountsForBeats(beatIds = []) {
  if (!beatIds.length) return { likeCounts: {}, favoriteCounts: {} }
  const likeCounts = {}
  const favCounts = {}
  const { data: likeRows } = await supabase.from('likes').select('beat_id').in('beat_id', beatIds)
  (likeRows || []).forEach(r => { likeCounts[r.beat_id] = (likeCounts[r.beat_id] || 0) + 1 })
  const { data: favRows } = await supabase.from('favorites').select('beat_id').in('beat_id', beatIds)
  (favRows || []).forEach(r => { favCounts[r.beat_id] = (favCounts[r.beat_id] || 0) + 1 })
  return { likeCounts, favoriteCounts: favCounts }
}

// Followers list and profiles
export async function fetchFollowers(producerId) {
  if (!producerId) return []
  const { data } = await supabase.from('follows').select('follower_id').eq('producer_id', producerId).order('created_at', { ascending: false }).limit(50)
  return data ? data.map(r => r.follower_id) : []
}
export async function fetchFollowerProfiles(producerId) {
  const ids = await fetchFollowers(producerId)
  if (!ids.length) return []
  return fetchProfilesByIds(ids)
}
