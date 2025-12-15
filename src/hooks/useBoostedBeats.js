import { useEffect, useState } from 'react'
import { listActiveBoosts } from '../services/boostsService'

export function useBoostedBeats() {
  const [boosts, setBoosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const data = await listActiveBoosts()
        if (active) setBoosts(Array.isArray(data) ? data : [])
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
