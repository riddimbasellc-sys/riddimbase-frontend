import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { computeBeatQuote, computeCartQuote } from '../services/paymentsService'
import { useBeats } from '../hooks/useBeats'
import useSupabaseUser from '../hooks/useSupabaseUser'
import { loadCart, replaceCart } from '../services/cartRepository'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const { user } = useSupabaseUser()
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

  // Sync with Supabase for logged-in users
  useEffect(() => {
    if (!user?.id) return
    ;(async () => {
      const remote = await loadCart(user.id)
      if (remote.length) {
        setItems(remote)
      }
    })()
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    replaceCart(user.id, items)
  }, [user?.id, items])

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
        const beat = remoteBeats.find((b) => b.id === it.beatId) || null
        const quote = computeBeatQuote({ beat, license: it.license })
        return { ...it, beat, quote }
      }),
    [items, remoteBeats],
  )

  const count = items.length
  const totals = useMemo(() => {
    const quote = computeCartQuote({
      items: enriched.map((it) => ({
        beat: it.beat,
        license: it.license,
      })),
    })
    const subtotal = quote?.subtotal || 0
    const serviceFee = quote?.serviceFee || 0
    const grand = quote?.grand || subtotal
    const serviceFeeRate = quote?.serviceFeeRate || 0
    return { subtotal, serviceFee, grand, serviceFeeRate }
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
