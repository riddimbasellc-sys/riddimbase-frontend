import { useEffect, useState } from 'react'
import useSupabaseUser from './useSupabaseUser'
import { fetchProfile, upsertProfile } from '../services/supabaseProfileRepository'

export default function useUserProfile() {
  const { user, loading } = useSupabaseUser()
  const [profile, setProfile] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      if (!loading && user) {
        const p = await fetchProfile(user.id)
        if (active) setProfile(p)
      }
    }
    load()
    return () => { active = false }
  }, [loading, user])

  const updateProfile = async (patch) => {
    if (!user) return null
    setSaving(true)
    const merged = { ...profile, ...patch }
    const payload = {
      display_name: merged.display_name || merged.displayName || user.email.split('@')[0],
      role: merged.role
    }
    if (merged.avatarUrl || merged.avatar_url) {
      payload.avatar_url = merged.avatar_url || merged.avatarUrl
    }
    // Optional extended fields – only send if present in patch/merged
    if (merged.country !== undefined) payload.country = merged.country || null
    if (merged.phone !== undefined) payload.phone = merged.phone || null
    if (merged.bio !== undefined) payload.bio = merged.bio || null
    if (merged.website !== undefined) payload.website = merged.website || null
    if (merged.instagram !== undefined) payload.instagram = merged.instagram || null
    if (merged.twitter_x !== undefined || merged.twitterX !== undefined) {
      payload.twitter_x = merged.twitter_x || merged.twitterX || null
    }
    if (merged.youtube !== undefined) payload.youtube = merged.youtube || null
    if (merged.genres !== undefined) payload.genres = merged.genres || null

    const stored = await upsertProfile(user.id, payload)
    setSaving(false)
    if (stored) {
      setProfile(stored)
      return stored
    }
    return null
  }

  // Provide normalized view
  const normalized = profile && {
    userId: user?.id,
    displayName: profile.display_name || profile.displayName || user?.email?.split('@')[0],
    accountType: profile.role,
    role: profile.role,
    avatarUrl: profile.avatar_url || profile.avatarUrl || null,
    country: profile.country || null,
    phone: profile.phone || null,
    bio: profile.bio || null,
    website: profile.website || null,
    instagram: profile.instagram || null,
    twitterX: profile.twitter_x || profile.twitterX || null,
    youtube: profile.youtube || null,
    genres: profile.genres || []
  }

  return { profile: normalized, updateProfile, user, loading, saving }
}
