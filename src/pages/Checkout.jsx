import BackButton from '../components/BackButton'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { computeBeatQuote, processPayment, generateLicense } from '../services/paymentsService'
import { sendFreeDownloadEmail } from '../services/notificationService'
import PayPalButtonsGroup from '../components/payments/PayPalButtonsGroup'
import { fetchBeat as fetchBeatRemote } from '../services/beatsRepository'

const LICENSES = ['Basic', 'Premium', 'Unlimited', 'Exclusive']

export function Checkout() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const locationBeat = (location.state && location.state.beat) || null
  const [remoteBeat, setRemoteBeat] = useState(null)
  const beat = locationBeat || remoteBeat

  useEffect(() => {
    let active = true
    ;(async () => {
      if (locationBeat || !id) return
      try {
        const data = await fetchBeatRemote(id)
        if (!data || !active) return
        setRemoteBeat({
          id: data.id,
          title: data.title,
          producer: data.producer || 'Unknown',
          userId: data.user_id || null,
          genre: data.genre || 'Dancehall',
          bpm: data.bpm || 0,
          price: data.price || 29,
          audioUrl: data.audio_url || null,
          untaggedUrl: data.untagged_url || null,
          coverUrl: data.cover_url || null,
          bundleUrl: data.bundle_url || null,
          description: data.description || '',
          licensePrices: data.license_prices || null,
          freeDownload: !!data.free_download,
        })
      } catch {
        // ignore fetch errors; beat will remain null
      }
    })()
    return () => {
      active = false
    }
  }, [id, locationBeat])

  const queryLicense = new URLSearchParams(location.search).get('license')
  const mode = new URLSearchParams(location.search).get('mode')
  const [license, setLicense] = useState(
    queryLicense && LICENSES.includes(queryLicense) ? queryLicense : LICENSES[0],
  )
  const [buyerName, setBuyerName] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [coupon, setCoupon] = useState('')
  const [couponApplied, setCouponApplied] = useState(null)
  const [currency, setCurrency] = useState('USD')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [billingAddress, setBillingAddress] = useState({
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
  })
  const [showServiceFeeInfo, setShowServiceFeeInfo] = useState(false)

  if (!beat) {
    return (
      <section className="bg-slate-950/95 min-h-screen flex items-center justify-center">
        <p className="text-sm text-slate-400">Loading beat detailsƒ?İ</p>
      </section>
    )
  }

  const freeMode = mode === 'free' || !!beat.freeDownload
  const quote = !freeMode
    ? computeBeatQuote({ beat, license, currency, coupon: couponApplied })
    : null

  const handlePay = async () => {
    if (!quote || !buyerEmail || !buyerName) return
    setLoading(true)
    const res = await processPayment({
      amount: quote.total,
      currency: quote.currency,
      billingAddress,
    })
    if (res.success) {
      const licenseRes = await generateLicense({
        beatTitle: beat.title,
        license,
        buyerEmail,
        amount: quote.total,
        buyerName,
        producerName: beat.producer,
        orderId: res.id,
      })
      setResult({ ...res, license: licenseRes })
      setTimeout(() => navigate('/artist/dashboard'), 3000)
    } else {
      setResult(res)
    }
    setLoading(false)
  }

  const selectDownloadUrlForLicense = () => {
    if (beat.bundleUrl || beat.bundle_url) return beat.bundleUrl || beat.bundle_url
    const tagged = beat.audioUrl || beat.audio_url || null
    const untagged = beat.untaggedUrl || beat.untagged_url || null
    if (license === 'Basic') return tagged || untagged || null
    return untagged || tagged || null
  }

  const handleFreeDownload = async () => {
    if (!buyerEmail || !buyerName) return
    setLoading(true)
    const downloadUrl = selectDownloadUrlForLicense()
    if (!downloadUrl) {
      setResult({ success: false, error: 'No download available for this beat.' })
      setLoading(false)
      return
    }
    try {
      await sendFreeDownloadEmail({ beatTitle: beat.title, downloadUrl, buyerEmail })
    } catch (e) {
      console.warn('[Checkout] free download email failed', e)
    }
    setResult({ success: true, downloadUrl })
    setLoading(false)
  }

  return (
    <section className="bg-slate-950/95 py-6 min-h-screen sm:py-10">
      <div className="mx-auto max-w-6xl px-3 flex flex-col gap-6 sm:px-4 md:flex-row md:gap-8">
        {/* Left column: Beat & Licensing Details */}
        <div className="flex-1 space-y-4">
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/80 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <BackButton />
              <div>
                <p className="text-sm font-semibold text-slate-50">Checkout</p>
                <p className="text-[11px] text-slate-400">
                  Licensing for <span className="font-semibold text-emerald-400">{beat.title}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 space-y-5">
            <div className="flex items-start gap-4">
              <div className="h-20 w-20 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-400 to-orange-500 flex-shrink-0">
                <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-slate-950/80">
                  RB
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-50">{beat.title}</p>
                <p className="text-[11px] text-slate-400">
                  {beat.producer} • {beat.genre} • {beat.bpm} BPM
                </p>
                {!freeMode && (
                  <div className="mt-3">
                    <label className="text-[10px] font-semibold text-slate-400">
                      Select License
                    </label>
                    <select
                      value={license}
                      onChange={(e) => setLicense(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-2 py-1.5 text-[12px] text-slate-100"
                    >
                      {LICENSES.map((l) => (
                        <option key={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400">Your Name</label>
                <input
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Artist / Buyer name"
                  className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-2 py-1.5 text-[12px] text-slate-100"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400">
                  Email for Delivery
                </label>
                <input
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-2 py-1.5 text-[12px] text-slate-100"
                />
              </div>
            </div>

            {/* Billing address */}
            {!freeMode && (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-semibold text-slate-400">
                    Billing Address
                  </label>
                  <input
                    value={billingAddress.line1}
                    onChange={(e) =>
                      setBillingAddress((prev) => ({ ...prev, line1: e.target.value }))
                    }
                    placeholder="Street address"
                    className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-2 py-1.5 text-[12px] text-slate-100"
                  />
                  <input
                    value={billingAddress.line2}
                    onChange={(e) =>
                      setBillingAddress((prev) => ({ ...prev, line2: e.target.value }))
                    }
                    placeholder="Apartment, suite, etc. (optional)"
                    className="mt-2 w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-2 py-1.5 text-[12px] text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-400">City</label>
                  <input
                    value={billingAddress.city}
                    onChange={(e) =>
                      setBillingAddress((prev) => ({ ...prev, city: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-2 py-1.5 text-[12px] text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-400">
                    State / Parish
                  </label>
                  <input
                    value={billingAddress.state}
                    onChange={(e) =>
                      setBillingAddress((prev) => ({ ...prev, state: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-2 py-1.5 text-[12px] text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-400">
                    Postal / Zip
                  </label>
                  <input
                    value={billingAddress.postalCode}
                    onChange={(e) =>
                      setBillingAddress((prev) => ({
                        ...prev,
                        postalCode: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-2 py-1.5 text-[12px] text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-400">Country</label>
                  <select
                    value={billingAddress.country}
                    onChange={(e) =>
                      setBillingAddress((prev) => ({ ...prev, country: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-2 py-1.5 text-[12px] text-slate-100"
                  >
                    <option value="">Select country</option>
                    <option value="JM">Jamaica</option>
                    <option value="TT">Trinidad &amp; Tobago</option>
                    <option value="BB">Barbados</option>
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="NG">Nigeria</option>
                    <option value="GH">Ghana</option>
                    <option value="BR">Brazil</option>
                    <option value="FR">France</option>
                    <option value="DE">Germany</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
            )}

            {!freeMode && (
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="text-[10px] font-semibold text-slate-400">
                    Coupon Code
                  </label>
                  <input
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value)}
                    placeholder="SAVE10"
                    className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-2 py-1.5 text-[12px] text-slate-100"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setCouponApplied(coupon.trim() || null)}
                  className="rounded-full bg-emerald-500 px-4 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400"
                >
                  Apply
                </button>
              </div>
            )}

            {result && (
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-4 text-[11px] text-slate-300 space-y-1">
                {!freeMode && (result.success ? (
                  <p>Payment successful. Generating license…</p>
                ) : (
                  <p className="text-red-300">Payment failed.</p>
                ))}
                {!freeMode && result.success && result.license && (
                  <p className="text-emerald-300">
                    License Ready:{' '}
                    <a
                      className="underline"
                      href={result.license.publicUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Download PDF
                    </a>
                  </p>
                )}
                {freeMode && result?.success && result?.downloadUrl && (
                  <p className="text-emerald-300">
                    Your download is ready:{' '}
                    <a
                      className="underline"
                      href={result.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Download Files
                    </a>
                  </p>
                )}
                {freeMode && result && result.success === false && (
                  <p className="text-red-300">
                    {result.error || 'Could not prepare free download.'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Summary & Payment */}
        <aside className="w-full md:w-80 space-y-4 mt-6 md:mt-0">
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/80 p-5 space-y-4">
            <p className="text-sm font-semibold text-slate-100">Order Summary</p>
            {!freeMode && quote && (
              <div className="space-y-1 text-[12px] text-slate-300">
                <p className="flex justify-between">
                  <span>License</span>
                  <span>{license}</span>
                </p>
                <p className="flex justify-between">
                  <span>Item Price</span>
                  <span>
                    {quote.currency} {quote.base.toFixed(2)}
                  </span>
                </p>
                {quote.discountRate > 0 && (
                  <p className="flex justify-between text-emerald-300">
                    <span>Coupon {(quote.discountRate * 100).toFixed(0)}%</span>
                    <span>
                      -{quote.currency} {quote.discountAmount.toFixed(2)}
                    </span>
                  </p>
                )}
                {quote.serviceFee > 0 && (
                  <p className="flex justify-between">
                    <span className="relative inline-flex items-center gap-1">
                      Service Fee
                      <button
                        type="button"
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-500 text-[9px] text-slate-200"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setShowServiceFeeInfo((v) => !v)
                        }}
                        onMouseEnter={() => setShowServiceFeeInfo(true)}
                        onMouseLeave={() => setShowServiceFeeInfo(false)}
                      >
                        i
                      </button>
                      {showServiceFeeInfo && (
                        <span className="absolute left-0 top-5 z-20 w-64 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-100 shadow-lg">
                          These fees contribute to maintaining and enhancing the platform, ensuring a seamless and secure experience for all users.
                        </span>
                      )}
                    </span>
                    <span>
                      {quote.currency} {quote.serviceFee.toFixed(2)}
                    </span>
                  </p>
                )}
                <p className="mt-2 flex justify-between font-semibold text-slate-50">
                  <span>Total</span>
                  <span>
                    {quote.currency} {quote.total.toFixed(2)}
                  </span>
                </p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/80 p-5">
            <p className="text-sm font-semibold text-slate-100">
              {freeMode ? 'Free Download' : 'Payment Method'}
            </p>
            {freeMode && (
              <div className="mt-3 text-[11px] text-slate-300">
                No payment required. Enter your name and email to receive your download link.
              </div>
            )}
            {!freeMode && quote && (
              <div className="mt-4 space-y-3">
                <PayPalButtonsGroup
                  amount={quote.total}
                  currency={quote.currency}
                  description={`License: ${license} • ${beat.title}`}
                  payerName={buyerName}
                  payerEmail={buyerEmail}
                  onSuccess={handlePay}
                  onError={(err) =>
                    setResult({
                      success: false,
                      error: err?.message || 'PayPal error',
                    })
                  }
                />
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  All beat licensing and service payments must be completed on-platform.
                  Off‑platform transactions are prohibited and may result in account ban.
                </p>
              </div>
            )}
            {freeMode && (
              <button
                disabled={loading || !buyerEmail || !buyerName}
                onClick={handleFreeDownload}
                className="mt-4 w-full rounded-full bg-emerald-500 px-6 py-2 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400 transition disabled:opacity-40"
              >
                {loading ? 'Preparing…' : 'Download Now'}
              </button>
            )}
            <p className="mt-3 text-[10px] text-slate-500 leading-relaxed">
              By completing this purchase you agree to our{' '}
              <a href="#" className="underline">
                Refund Policy
              </a>
              ,{' '}
              <a href="#" className="underline">
                Terms of Service
              </a>
              , and{' '}
              <a href="#" className="underline">
                Privacy Policy
              </a>
              . Taxes may apply.
            </p>
          </div>
        </aside>
      </div>
    </section>
  )
}
