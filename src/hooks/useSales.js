import { useEffect, useState } from 'react'
import { listSalesAsync } from '../services/beatsService'

export function useSales() {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    listSalesAsync()
      .then(data => {
        if (!active) return
        // data is already normalized by beatsService
        setSales(data)
        setLoading(false)
      })
      .catch(() => {
        setSales([])
        setLoading(false)
      })
    return () => { active = false }
  }, [])

  return { sales, loading }
}
