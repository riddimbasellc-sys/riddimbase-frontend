import BackButton from '../components/BackButton'
import { BeatCard } from '../components/BeatCard'
import useSupabaseUser from '../hooks/useSupabaseUser'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useBeats } from '../hooks/useBeats'

export function Favorites() {
  const { user, loading } = useSupabaseUser()
  const { beats, loading: beatsLoading } = useBeats()
  const [favBeatIds, setFavBeatIds] = useState([])

  useEffect(() => {
    ;(async () => {
      if (!user) return
      const { data, error } = await supabase
        .from('favorites')
        .select('beat_id')
        .eq('user_id', user.id)
      if (!error && data) setFavBeatIds(data.map((r) => r.beat_id))
    })()
  }, [user])

  if (loading || beatsLoading) {
    return (
      <section className="bg-slate-950/95 min-h-screen flex items-center justify-center">
        <p className="text-sm text-slate-300">Loading...</p>
      </section>
    )
  }

  if (!user) {
    return (
      <section className="bg-slate-950/95 min-h-screen flex items-center justify-center">
        <p className="text-sm text-slate-300">Log in to view favorites.</p>
      </section>
    )
  }

  const favoriteBeats = beats.filter((b) => favBeatIds.includes(b.id))

  return (
    <section className="bg-slate-950/95">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="font-display text-2xl font-semibold text-slate-50">
            Your Favorites
          </h1>
        </div>
        <p className="mt-1 text-sm text-slate-300">Beats you have favorited.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {favoriteBeats.map((b) => (
            <BeatCard
              key={b.id}
              {...b}
              coverUrl={b.coverUrl || null}
              audioUrl={b.audioUrl}
              square
            />
          ))}
          {favoriteBeats.length === 0 && (
            <p className="text-xs text-slate-500">
              No favorites yet. Tap the heart on a beat to add it here.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

export default Favorites
