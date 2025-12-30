import { useEffect, useMemo, useState } from 'react'
import { useBeats } from '../hooks/useBeats'
import { followerCount } from '../services/socialService'
import { getTotalPlaysForBeats } from '../services/analyticsService'
import { supabase } from '../lib/supabaseClient'
import { isProducerProPlanId } from '../services/subscriptionService'
import VerifiedBadge from './VerifiedBadge'

export default function TrendingProducers() {
  const { beats } = useBeats()
  const [followersMap, setFollowersMap] = useState({})
  const [proMap, setProMap] = useState({})
  const [profileNames, setProfileNames] = useState({})

  // Group beats by producer
  const byProducer = useMemo(() => {
    const map = {}
    for (const b of beats) {
      if (!b.userId) continue
      if (!map[b.userId]) map[b.userId] = []
      map[b.userId].push(b.id)
    }
    return map
  }, [beats])

  // Fetch follower counts for producers in view
  useEffect(() => {
    const producerIds = Object.keys(byProducer)
    if (!producerIds.length) {
      setFollowersMap({})
      setProMap({})
      return
    }
    let active = true
    ;(async () => {
      const next = {}
      for (const pid of producerIds) {
        try {
          next[pid] = await followerCount(pid)
        } catch {
          next[pid] = 0
        }
      }
      if (active) setFollowersMap(next)
    })()
    return () => {
      active = false
    }
  }, [byProducer])

  // Fetch producer display names so we show usernames instead of raw IDs
  useEffect(() => {
    const producerIds = Object.keys(byProducer)
    if (!producerIds.length) {
      setProfileNames({})
      return
    }
    let active = true
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, display_name, email')
          .in('id', producerIds)
        if (error || !data || !active) return
        const next = {}
        for (const row of data) {
          const emailName = (row.email || '').split('@')[0] || null
          next[row.id] = row.display_name || emailName || row.id
        }
        setProfileNames(next)
      } catch {
        if (active) setProfileNames({})
      }
    })()
    return () => {
      active = false
    }
  }, [byProducer])

  useEffect(() => {
    const producerIds = Object.keys(byProducer)
    if (!producerIds.length) {
      setProMap({})
      return
    }
    let active = true
    ;(async () => {
      try {
        const { data: subs } = await supabase
          .from('subscriptions')
          .select('user_id, plan_id, status')
          .in('user_id', producerIds)
          .in('status', ['active', 'trialing', 'past_due'])
        if (!active) return
        const next = {}
        ;(subs || []).forEach((row) => {
          if (isProducerProPlanId(row.plan_id)) next[row.user_id] = true
        })
        setProMap(next)
      } catch {
        if (active) setProMap({})
      }
    })()
    return () => {
      active = false
    }
  }, [byProducer])

  const ranked = useMemo(() => {
    const entries = Object.entries(byProducer).map(([pid, beatIds]) => {
      const beatCount = beatIds.length
      const plays = getTotalPlaysForBeats(beatIds)
      const followers = followersMap[pid] || 0
      // Simple score: followers weighted highest, then plays, then catalog size
      const score = followers * 5 + plays * 1 + beatCount * 2
        return { pid, beatCount, plays, followers, score }
    })
    return entries
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
  }, [byProducer, followersMap])

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-100">Top Beatmakers</h3>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {ranked.map((row) => (
          <a
            key={row.pid}
            href={`/producer/${row.pid}`}
            className="rounded-xl border border-slate-800/70 bg-slate-900/70 p-3 hover:border-emerald-400/70 transition"
          >
            <p className="text-xs font-semibold text-emerald-300">Producer</p>
            <p className="mt-1 text-sm font-medium text-slate-200 truncate">
              <span className="inline-flex items-center gap-1">
                {profileNames[row.pid] || row.pid}
                {proMap[row.pid] && <VerifiedBadge className="h-4 w-4 text-sky-300" />}
              </span>
            </p>
            <p className="text-[10px] text-slate-400">
              {row.followers} follower{row.followers === 1 ? '' : 's'} •{' '}
              {row.plays} play{row.plays === 1 ? '' : 's'}
            </p>
          </a>
        ))}
        {ranked.length === 0 && (
          <p className="text-xs text-slate-500">No producers yet.</p>
        )}
      </div>
    </div>
  )
}

