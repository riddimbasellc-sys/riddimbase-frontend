import { useEffect, useState } from 'react'
import { listSalesAsync, listSales } from '../services/beatsService'

export function useSales() {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    listSalesAsync().then(data => {
      if (!active) return
      // normalize structure to common shape
      const normalized = data.map(s => ({
        beatId: s.beatId,
        license: s.license,
        buyer: s.buyer,
        amount: s.amount,
        createdAt: s.createdAt,
      }))
      setSales(normalized)
      setLoading(false)
    }).catch(() => {
      setSales(listSales())
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  return { sales, loading }
}
