import { supabase } from '../lib/supabaseClient'
import useSupabaseUser from '../hooks/useSupabaseUser'
import { addNotification } from './notificationsRepository'

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
      // fire notification for producer in background
      try {
        if (producerId !== userId) {
          const [{ data: profile }, { data: beat }] = await Promise.all([
            supabase
              .from('profiles')
              .select('display_name,email')
              .eq('id', userId)
              .maybeSingle(),
            supabase
              .from('beats')
              .select('title')
              .eq('id', beatId)
              .maybeSingle(),
          ])
          const actorName =
            profile?.display_name || profile?.email || 'User'
          await addNotification({
            recipientId: producerId,
            actorId: userId,
            type: 'like',
            data: {
              user: actorName,
              beatTitle: beat?.title || null,
              beatId,
            },
          })
        }
      } catch {
        // ignore notification failure
      }
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
export async function toggleFavorite({ userId, beatId, producerId }) {
  if (!userId || !beatId) return { success: false }
  const existing = await supabase.from('favorites').select('id').eq('user_id', userId).eq('beat_id', beatId).maybeSingle()
  if (existing.data && existing.data.id) {
    await supabase.from('favorites').delete().eq('id', existing.data.id)
    return { favorited: false }
  } else {
    await supabase.from('favorites').insert({ user_id: userId, beat_id: beatId })
    // send producer notification if available
    if (producerId && producerId !== userId) {
      try {
        const [{ data: profile }, { data: beat }] = await Promise.all([
          supabase
            .from('profiles')
            .select('display_name,email')
            .eq('id', userId)
            .maybeSingle(),
          supabase
            .from('beats')
            .select('title')
            .eq('id', beatId)
            .maybeSingle(),
        ])
        const actorName = profile?.display_name || profile?.email || 'User'
        await addNotification({
          recipientId: producerId,
          actorId: userId,
          type: 'favorite',
          data: {
            user: actorName,
            beatTitle: beat?.title || null,
            beatId,
          },
        })
      } catch {
        // ignore
      }
    }
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
    // Notify producer about new follower
    try {
      if (producerId !== followerId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name,email')
          .eq('id', followerId)
          .maybeSingle()
        const actorName =
          profile?.display_name || profile?.email || 'User'
        await addNotification({
          recipientId: producerId,
          actorId: followerId,
          type: 'follow',
          data: { user: actorName },
        })
      }
    } catch {
      // ignore
    }
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
export async function toggleRepost({ userId, beatId, producerId }) {
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

    // Notify producer that their beat was reposted
    if (producerId && producerId !== userId) {
      try {
        const [{ data: profile }, { data: beat }] = await Promise.all([
          supabase
            .from('profiles')
            .select('display_name,email')
            .eq('id', userId)
            .maybeSingle(),
          supabase
            .from('beats')
            .select('title')
            .eq('id', beatId)
            .maybeSingle(),
        ])
        const actorName =
          profile?.display_name || profile?.email || 'User'
        await addNotification({
          recipientId: producerId,
          actorId: userId,
          type: 'repost',
          data: {
            user: actorName,
            beatTitle: beat?.title || null,
            beatId,
          },
        })
      } catch {
        // ignore notification failure
      }
    }

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

// Beat comments
export async function listBeatComments(beatId) {
  if (!beatId) return []
  const { data, error } = await supabase
    .from('beat_comments')
    .select('id, beat_id, user_id, content, created_at')
    .eq('beat_id', beatId)
    .order('created_at', { ascending: false })
  if (error) {
    console.warn('[socialService] listBeatComments error', error.message)
    return []
  }
  const rows = data || []
  const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)))
  let profileMap = new Map()
  if (userIds.length) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', userIds)
    profileMap = new Map((profiles || []).map((p) => [p.id, p.display_name]))
  }
  return rows.map((row) => ({
    id: row.id,
    beatId: row.beat_id,
    userId: row.user_id,
    content: row.content,
    createdAt: row.created_at,
    displayName: profileMap.get(row.user_id) || 'User',
  }))
}

export async function addBeatComment({ beatId, userId, content }) {
  if (!beatId || !userId || !content.trim()) return { success: false }
  const { data, error } = await supabase
    .from('beat_comments')
    .insert({ beat_id: beatId, user_id: userId, content: content.trim() })
    .select('id, beat_id, user_id, content, created_at')
    .maybeSingle()
  if (error || !data) {
    console.warn('[socialService] addBeatComment error', error?.message)
    return { success: false, error }
  }
  // Fetch display name for the new comment
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', data.user_id)
    .maybeSingle()
  // Notify beat owner about new comment
  try {
    const { data: beatRow } = await supabase
      .from('beats')
      .select('user_id,title')
      .eq('id', beatId)
      .maybeSingle()
    const recipientId = beatRow?.user_id || null
    if (recipientId && recipientId !== userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name,email')
        .eq('id', userId)
        .maybeSingle()
      const actorName =
        profile?.display_name || profile?.email || 'User'
      await addNotification({
        recipientId,
        actorId: userId,
        type: 'comment',
        data: {
          user: actorName,
          text: content.trim(),
          beatTitle: beatRow?.title || null,
          beatId,
        },
      })
    }
  } catch {
    // ignore notification failure
  }

  return {
    success: true,
    comment: {
      id: data.id,
      beatId: data.beat_id,
      userId: data.user_id,
      content: data.content,
      createdAt: data.created_at,
      displayName: profile?.display_name || 'User',
    },
  }
}

export function subscribeBeatComments({ beatId, onComment }) {
  if (!beatId) return () => {}
  const channel = supabase
    .channel(`beat-comments-${beatId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'beat_comments', filter: `beat_id=eq.${beatId}` },
      (payload) => {
        const row = payload.new
        if (!row) return
        onComment &&
          onComment({
            id: row.id,
            beatId: row.beat_id,
            userId: row.user_id,
            content: row.content,
            createdAt: row.created_at,
          })
      },
    )
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}

// Messages
export async function sendMessage({
  senderId,
  recipientId,
  content,
  attachmentUrl,
  attachmentType,
  attachmentName,
}) {
  if (!senderId || !recipientId || (!content && !attachmentUrl)) {
    return { success: false }
  }

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

  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: senderId,
      recipient_id: recipientId,
      content: content || '',
      attachment_url: attachmentUrl || null,
      attachment_type: attachmentType || null,
      attachment_name: attachmentName || null,
    })
    .select()
    .maybeSingle()
  if (error || !data) return { success: false, error }

  // Notify recipient of new message
  try {
    if (recipientId !== senderId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name,email')
        .eq('id', senderId)
        .maybeSingle()
      const actorName =
        profile?.display_name || profile?.email || 'Someone'
      await addNotification({
        recipientId,
        actorId: senderId,
        type: 'message',
        data: {
          from: actorName,
          snippet:
            (content && content.slice(0, 80)) ||
            (attachmentName ? `[Attachment] ${attachmentName}` : '[Attachment]'),
          email: profile?.email || null,
        },
      })
    }
  } catch {
    // ignore notification failure
  }

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
    .select('id,sender_id,recipient_id,content,created_at,attachment_url,attachment_type,attachment_name')
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
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, email, avatar_url, username')
    .in('id', ids)
  return data || []
}

// Beats reposted by people the user follows (and by the user themselves) for feed sections
export async function fetchRepostedBeatIdsForUser(userId, { limit = 24 } = {}) {
  if (!userId) return []
  // Get producers this user follows
  const { data: followRows } = await supabase
    .from('follows')
    .select('producer_id')
    .eq('follower_id', userId)
  const producerIds = (followRows || []).map((r) => r.producer_id).filter(Boolean)
  const userIds = Array.from(new Set([...producerIds, userId]))
  if (!userIds.length) return []

  const { data: repostRows } = await supabase
    .from('reposts')
    .select('beat_id, user_id, created_at')
    .in('user_id', userIds)
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
