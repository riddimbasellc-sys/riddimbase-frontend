import { supabase } from '../lib/supabaseClient'

const POSTS_TABLE = 'feed_posts'
const LIKES_TABLE = 'feed_post_likes'
const COMMENTS_TABLE = 'feed_post_comments'

function mapPost(row, profileMap) {
  const profile = profileMap?.get(row.user_id) || {}
  return {
    id: row.id,
    userId: row.user_id,
    content: row.content || '',
    attachmentUrl: row.attachment_url || null,
    attachmentType: row.attachment_type || null,
    attachmentName: row.attachment_name || null,
    originalPostId: row.original_post_id || null,
    createdAt: row.created_at,
    displayName: profile.display_name || profile.email || 'Creator',
    avatarUrl: profile.avatar_url || null,
  }
}

export async function createPost({
  userId,
  content,
  attachmentUrl,
  attachmentType,
  attachmentName,
  originalPostId = null,
}) {
  if (!userId || (!content && !attachmentUrl)) return null
  const payload = {
    user_id: userId,
    content: content || '',
    attachment_url: attachmentUrl || null,
    attachment_type: attachmentType || null,
    attachment_name: attachmentName || null,
    original_post_id: originalPostId,
  }
  const { data, error } = await supabase
    .from(POSTS_TABLE)
    .insert(payload)
    .select('*')
    .maybeSingle()
  if (error || !data) {
    console.warn('[feedService] createPost error', error?.message)
    return null
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('id,display_name,avatar_url,email')
    .eq('id', userId)
    .maybeSingle()
  const map = new Map()
  if (profile) map.set(profile.id, profile)
  return mapPost(data, map)
}

export async function fetchFeedForUser(userId, { limit = 48 } = {}) {
  if (!userId) return []
  // Get producers this user follows plus self
  const { data: follows } = await supabase
    .from('follows')
    .select('producer_id')
    .eq('follower_id', userId)
  const ids = Array.from(
    new Set([userId, ...(follows || []).map((r) => r.producer_id).filter(Boolean)]),
  )
  if (!ids.length) return []

  const { data: posts, error } = await supabase
    .from(POSTS_TABLE)
    .select('*')
    .in('user_id', ids)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error || !posts) {
    console.warn('[feedService] fetchFeedForUser error', error?.message)
    return []
  }
  const userIds = Array.from(new Set(posts.map((p) => p.user_id).filter(Boolean)))
  let profileMap = new Map()
  if (userIds.length) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id,display_name,avatar_url,email')
      .in('id', userIds)
    profileMap = new Map((profiles || []).map((p) => [p.id, p]))
  }
  return posts.map((row) => mapPost(row, profileMap))
}

export async function fetchOwnPosts(userId, { limit = 24 } = {}) {
  if (!userId) return []
  const { data: posts, error } = await supabase
    .from(POSTS_TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error || !posts) return []
  const { data: profile } = await supabase
    .from('profiles')
    .select('id,display_name,avatar_url,email')
    .eq('id', userId)
    .maybeSingle()
  const map = new Map()
  if (profile) map.set(profile.id, profile)
  return posts.map((row) => mapPost(row, map))
}

export async function togglePostLike({ userId, postId }) {
  if (!userId || !postId) return { liked: false }
  const { data: existing } = await supabase
    .from(LIKES_TABLE)
    .select('id')
    .eq('user_id', userId)
    .eq('post_id', postId)
    .maybeSingle()
  if (existing) {
    await supabase.from(LIKES_TABLE).delete().eq('id', existing.id)
    return { liked: false }
  }
  await supabase.from(LIKES_TABLE).insert({ user_id: userId, post_id: postId })
  return { liked: true }
}

export async function postLikeCount(postId) {
  if (!postId) return 0
  const { count } = await supabase
    .from(LIKES_TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId)
  return count || 0
}

export async function listPostComments(postId) {
  if (!postId) return []
  const { data, error } = await supabase
    .from(COMMENTS_TABLE)
    .select('id,post_id,user_id,content,created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
  if (error || !data) return []
  const userIds = Array.from(new Set(data.map((c) => c.user_id).filter(Boolean)))
  let profileMap = new Map()
  if (userIds.length) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id,display_name,avatar_url,email')
      .in('id', userIds)
    profileMap = new Map((profiles || []).map((p) => [p.id, p]))
  }
  return data.map((row) => {
    const profile = profileMap.get(row.user_id) || {}
    return {
      id: row.id,
      postId: row.post_id,
      userId: row.user_id,
      content: row.content,
      createdAt: row.created_at,
      displayName: profile.display_name || profile.email || 'User',
      avatarUrl: profile.avatar_url || null,
    }
  })
}

export async function addPostComment({ postId, userId, content }) {
  if (!postId || !userId || !content?.trim()) return null
  const { data, error } = await supabase
    .from(COMMENTS_TABLE)
    .insert({ post_id: postId, user_id: userId, content: content.trim() })
    .select('id,post_id,user_id,content,created_at')
    .maybeSingle()
  if (error || !data) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('id,display_name,avatar_url,email')
    .eq('id', userId)
    .maybeSingle()
  return {
    id: data.id,
    postId: data.post_id,
    userId: data.user_id,
    content: data.content,
    createdAt: data.created_at,
    displayName: profile?.display_name || profile?.email || 'User',
    avatarUrl: profile?.avatar_url || null,
  }
}

