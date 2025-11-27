import { useEffect, useState } from 'react'
import { listActiveBoosts } from '../services/boostsService'

export function useBoostedBeats() {
  const [boosts, setBoosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const res = await fetch('/api/boosted')
        if (!res.ok) {
          // Fallback to local prototype data
          const local = listActiveBoosts()
          if (active) setBoosts(local)
          return
        }
        const data = await res.json()
        if (active) setBoosts(Array.isArray(data) ? data : [])
      } catch {
        if (active) setBoosts(listActiveBoosts())
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [])

  return { boosts, loading }
}

