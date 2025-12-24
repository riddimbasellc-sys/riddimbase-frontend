import { useEffect, useState } from 'react'
import BackButton from '../components/BackButton'
import useSupabaseUser from '../hooks/useSupabaseUser'
import PayPalButtonsGroup from '../components/payments/PayPalButtonsGroup'

const DEFAULT_PACKS = [
  { id: 'pack_500', credits: 500, priceUsd: 5 },
  { id: 'pack_1200', credits: 1200, priceUsd: 10 },
  { id: 'pack_3000', credits: 3000, priceUsd: 20 },
]

function StudioCredits() {
  const { user } = useSupabaseUser()
  const [balance, setBalance] = useState(null)
  const [packs, setPacks] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(false)
  const [buyingPackId, setBuyingPackId] = useState('')
  const [selectedPackId, setSelectedPackId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const apiBase = import.meta?.env?.VITE_API_BASE_URL || 'https://riddimbasellc-server.onrender.com'

  useEffect(() => {
    const run = async () => {
      if (!user?.id) return
      try {
        setLoading(true)
        setError('')
        const res = await fetch(`${apiBase}/credits/balance`, {
          headers: { 'x-user-id': user.id },
        })
        if (!res.ok) throw new Error('Failed to load balance')
        const data = await res.json()
        if (typeof data.balance === 'number') setBalance(data.balance)
        if (Array.isArray(data.packs)) setPacks(data.packs)
        if (Array.isArray(data.plans)) setPlans(data.plans)
      } catch (e) {
        setError(e.message || 'Unable to load credits')
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [user?.id])

  useEffect(() => {
    const available = packs.length ? packs : DEFAULT_PACKS
    if (!available.length) return
    setSelectedPackId((prev) => prev || available[0].id)
  }, [packs])

  const availablePacks = packs.length ? packs : DEFAULT_PACKS
  const selectedPack = availablePacks.find((p) => p.id === selectedPackId) ||
    (availablePacks.length ? availablePacks[0] : null)

  const handlePayPalSuccess = async ({ orderId }) => {
    if (!user?.id || !selectedPack) return
    try {
      setBuyingPackId(selectedPack.id)
      setError('')
      setMessage('')
      const res = await fetch(`${apiBase}/credits/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          packId: selectedPack.id,
          meta: {
            paypal_order_id: orderId,
            packCredits: selectedPack.credits,
            packPriceUsd: selectedPack.priceUsd,
          },
        }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error || 'Failed to add credits after PayPal')
      }
      const data = await res.json().catch(() => ({}))
      if (typeof data.balance === 'number') setBalance(data.balance)
      setMessage('Payment successful. Credits added to your account.')
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[studio-credits] PayPal success handling error', e)
      setError(e.message || 'Unable to add credits after PayPal payment.')
    } finally {
      setBuyingPackId('')
    }
  }

  const handlePayPalError = (err) => {
    // eslint-disable-next-line no-console
    console.error('[studio-credits] PayPal error', err)
    setError(err?.message || 'PayPal payment failed or was cancelled.')
  }

  const formatPrice = (n) => {
    if (n == null) return ''
    const num = Number(n)
    if (!Number.isFinite(num)) return ''
    return `$${num.toFixed(2)}`
  }

  if (!user) {
    return (
      <section className="min-h-screen bg-slate-950/95">
        <div className="mx-auto max-w-5xl px-4 py-10 text-slate-100">
          <BackButton />
          <h1 className="mt-4 font-display text-2xl font-semibold">Studio Credits</h1>
          <p className="mt-2 text-sm text-slate-300">Log in to view your Recording Lab balance and buy credits.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="min-h-screen bg-slate-950/95">
      <div className="mx-auto max-w-5xl px-4 py-10 text-slate-100">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-400">Recording Lab</p>
            <h1 className="font-display text-2xl font-semibold">Studio Credits</h1>
            <p className="mt-1 text-[12px] text-slate-300">Top up credits for the in-browser Recording Lab. Each session uses 200 credits.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.7fr)]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Your balance</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-300">
                {loading && balance == null ? '…' : balance != null ? balance.toLocaleString('en-US') : '—'}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">200 credits per Recording Lab session.</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Credit packs</p>
              {message && <span className="text-[10px] text-emerald-300">{message}</span>}
              {error && !message && <span className="text-[10px] text-rose-300">{error}</span>}
            </div>
            <div className="grid gap-3 md:grid-cols-3 text-[12px]">
              {availablePacks.map((pack) => (
                <div
                  key={pack.id}
                  className="flex flex-col rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-rb-gloss-panel"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Pack</p>
                  <p className="mt-1 text-sm font-semibold text-slate-50">{pack.credits?.toLocaleString('en-US') || pack.credits} credits</p>
                  <p className="mt-1 text-[11px] text-slate-400">{formatPrice(pack.priceUsd)}</p>
                  <div className="mt-4 flex-1" />
                  <button
                    type="button"
                    disabled={!!buyingPackId}
                    onClick={() => setSelectedPackId(pack.id)}
                    className={`mt-2 rounded-full px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50 ${
                      selectedPackId === pack.id
                        ? 'bg-emerald-400 text-slate-950'
                        : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
                    }`}
                  >
                    {selectedPackId === pack.id ? 'Selected' : 'Select pack'}
                  </button>
                  <p className="mt-1 text-[10px] text-slate-500">Choose a pack, then pay securely via PayPal below. Credits are added automatically after payment.</p>
                </div>
              ))}
            </div>
            {selectedPack && (
              <div className="mt-4 space-y-2">
                <p className="text-[11px] text-slate-400">
                  Pay {formatPrice(selectedPack.priceUsd)} for{' '}
                  {selectedPack.credits?.toLocaleString('en-US') || selectedPack.credits} credits with PayPal:
                </p>
                <PayPalButtonsGroup
                  amount={selectedPack.priceUsd}
                  currency="USD"
                  description={`Studio credits pack: ${selectedPack.credits} credits`}
                  payerEmail={user?.email || ''}
                  onSuccess={handlePayPalSuccess}
                  onError={handlePayPalError}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default StudioCredits
