import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getBeat } from '../services/beatsService'
import { computeBeatQuote } from '../services/paymentsService'
import { useBeats } from '../hooks/useBeats'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem('rb_cart')
      if (!raw) return []
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed.filter(it => it && it.beatId)
    } catch { return [] }
  })

  useEffect(() => {
    try { localStorage.setItem('rb_cart', JSON.stringify(items)) } catch {}
  }, [items])

  // Supabase-backed beats (single source of truth for marketplace)
  const { beats: remoteBeats } = useBeats()

  const addBeat = (beatId, license = 'Basic') => {
    setItems(prev => {
      if (prev.some(p => p.beatId === beatId)) return prev
      return [...prev, { beatId, license }]
    })
  }
  const removeBeat = (beatId) => setItems(prev => prev.filter(p => p.beatId !== beatId))
  const updateLicense = (beatId, license) => setItems(prev => prev.map(p => p.beatId === beatId ? { ...p, license } : p))
  const clearCart = () => setItems([])

  // Derived enriched items with beat data & quote
  const enriched = useMemo(
    () =>
      items.map((it) => {
        const localBeat = getBeat(it.beatId)
        const remoteBeat =
          remoteBeats.find((b) => b.id === it.beatId) || null
        const beat = localBeat || remoteBeat || null
        const quote = computeBeatQuote({ beat, license: it.license })
        return { ...it, beat, quote }
      }),
    [items, remoteBeats],
  )

  const count = items.length
  const totals = useMemo(() => {
    const subtotal = enriched.reduce(
      (sum, it) => sum + (it.quote?.total || 0),
      0,
    )
    const serviceFeeRate = 0
    const serviceFee = 0
    return { subtotal, serviceFee, grand: subtotal, serviceFeeRate }
  }, [enriched])

  return (
    <CartContext.Provider value={{ items, enriched, count, totals, addBeat, removeBeat, updateLicense, clearCart }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
