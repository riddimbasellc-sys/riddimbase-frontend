import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export function AdminChatRightPanel({ activeConversationId, blockUser, reportUser }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      if (!activeConversationId) {
        setProfile(null)
        setError('')
        return
      }
      setLoading(true)
      setError('')
      try {
        const { data: participants, error: partError } = await supabase
          .from('chat_participants')
          .select('user_id, role')
          .eq('conversation_id', activeConversationId)

        if (partError) {
          if (!active) return
          setError('Failed to load participants')
          setProfile(null)
          setLoading(false)
          return
        }

        const member = (participants || []).find((p) => p.role !== 'admin') || null
        if (!member) {
          if (!active) return
          setProfile(null)
          setLoading(false)
          return
        }

        const { data: prof, error: profError } = await supabase
          .from('profiles')
          .select('id, display_name, email')
          .eq('id', member.user_id)
          .maybeSingle()

        if (!active) return
        if (profError) {
          setError('Failed to load user profile')
          setProfile(null)
        } else if (!prof) {
          setProfile(null)
        } else {
          const displayName = prof.display_name || prof.email || 'User'
          const initials = displayName
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase() || '')
            .join('') || 'RB'
          setProfile({
            ...prof,
            initials,
          })
        }
        setLoading(false)
      } catch (e) {
        if (!active) return
        setError('Failed to load user profile')
        setProfile(null)
        setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [activeConversationId])

  const handleBlock = async () => {
    if (!profile?.id || !blockUser) return
    try {
      await blockUser(profile.id)
    } catch (e) {
      // no-op; keep UI simple
    }
  }

  const handleReport = async () => {
    if (!profile?.id || !reportUser || !activeConversationId) return
    try {
      await reportUser({
        reportedUserId: profile.id,
        conversationId: activeConversationId,
        messageId: null,
        reason: 'admin-panel-report',
      })
    } catch (e) {
      // no-op
    }
  }

  const showEmpty = !activeConversationId || (!loading && !profile && !error)

  return (
    <aside className="hidden xl:flex w-72 border-l border-slate-800/70 bg-slate-950/80 backdrop-blur-xl flex-col px-4 py-4">
      <h2 className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-400">
        User Profile
      </h2>
      {showEmpty ? (
        <p className="mt-3 text-[11px] text-slate-500">
          Select a conversation to view user details.
        </p>
      ) : loading ? (
        <p className="mt-3 text-[11px] text-slate-500">Loading user details…</p>
      ) : error ? (
        <p className="mt-3 text-[11px] text-rose-300">{error}</p>
      ) : profile ? (
        <>
          <div className="mt-3 rounded-2xl border border-slate-800/80 bg-slate-900/70 p-3 text-[11px] text-slate-100 space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-[13px] font-semibold">
                {profile.initials}
              </div>
              <div>
                <p className="font-semibold">{profile.display_name || profile.email || 'User'}</p>
                <p className="text-[10px] text-slate-400">{profile.email}</p>
              </div>
            </div>
            <p className="text-[10px] text-emerald-300">Status: Active</p>
          </div>
          <div className="mt-3 space-y-2 text-[11px]">
            <button
              type="button"
              onClick={handleBlock}
              className="w-full rounded-full border border-rose-500/80 bg-rose-600/10 px-3 py-1.5 text-rose-300 hover:bg-rose-600/20"
            >
              Block user
            </button>
            <button
              type="button"
              onClick={handleReport}
              className="w-full rounded-full border border-amber-500/80 bg-amber-500/10 px-3 py-1.5 text-amber-200 hover:bg-amber-500/20"
            >
              Report user
            </button>
          </div>
        </>
      ) : null}
    </aside>
  )
}
