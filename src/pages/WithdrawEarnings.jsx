import useSupabaseUser from '../hooks/useSupabaseUser'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BackButton from '../components/BackButton'
import { computeProducerEarnings } from '../services/beatsService'
import {
  listUserPayouts,
  createPayout,
  cancelPayout,
} from '../services/payoutsRepository'
import { getSubscription } from '../services/subscriptionService'

export function WithdrawEarnings() {
  const { user, loading } = useSupabaseUser()
  const navigate = useNavigate()
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [payouts, setPayouts] = useState([])
  const [methodType, setMethodType] = useState('paypal')
  const [paypalEmail, setPaypalEmail] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [routingNumber, setRoutingNumber] = useState('')
  const [bankBranch, setBankBranch] = useState('')
  const [accountType, setAccountType] = useState('checking')
  const [subscription, setSubscription] = useState(null)

  const PLATFORM_COMMISSION_RATE = 0.15
  const PAYPAL_PCT = 0.029
  const PAYPAL_FIXED = 0.3

  useEffect(() => {
    if (!loading && !user) navigate('/login')
  }, [loading, user, navigate])

  useEffect(() => {
    if (user?.id) {
      ;(async () => {
        const data = await listUserPayouts(user.id)
        setPayouts(data)
      })()
    }
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    ;(async () => {
      const sub = await getSubscription(user.id)
      setSubscription(sub)
    })()
  }, [user?.id])

  if (loading) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-slate-950/95">
        <p className="text-sm text-slate-300">Loading...</p>
      </section>
    )
  }
  if (!user) return null

  const gross = computeProducerEarnings({ userId: user.id, displayName: user.email })
  const completedTotal = payouts.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0)
  const pendingTotal = payouts.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0)
  const available = Math.max(0, gross - completedTotal - pendingTotal)

  const val = parseFloat(amount) || 0
  const withdrawalFee = 0
  const planId = subscription?.planId || 'free'
  const zeroCommission =
    planId === 'producer-pro' || planId === 'pro-yearly'
  const effectiveCommissionRate = zeroCommission ? 0 : PLATFORM_COMMISSION_RATE
  const commissionFee = val > 0 ? val * effectiveCommissionRate : 0
  const computePayPalFee = (amt) => amt * PAYPAL_PCT + PAYPAL_FIXED
  const processorFee = methodType === 'paypal' && val > 0 ? computePayPalFee(val) : 0
  const netAfterFees = val > 0 ? Math.max(0, val - withdrawalFee - commissionFee - processorFee) : 0

  const submit = async (e) => {
    e.preventDefault()
    const v = parseFloat(amount)
    if (!v || v <= 0 || v > available) return
    if (methodType === 'paypal' && !paypalEmail) return
    if (methodType === 'bank' && (!bankName || !accountNumber || !accountType)) return
    setSubmitting(true)
    let methodDetails =
      methodType === 'paypal'
        ? { paypalEmail }
        : { bankName, accountLast4: accountNumber.slice(-4), accountType }
    if (bankBranch) methodDetails.bankBranch = bankBranch
    if (routingNumber) methodDetails.routingNumber = routingNumber
    const p = await createPayout({
      userId: user.id,
      amount: v,
      currency,
      methodType,
      methodDetails: JSON.stringify(methodDetails),
    })
    setResult(p)
    setPayouts(await listUserPayouts(user.id))
    setTimeout(() => {
      setSubmitting(false)
      navigate('/producer/dashboard')
    }, 1800)
  }

  return (
    <section className="bg-slate-950/95 min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-4 flex items-center gap-3">
          <BackButton />
          <h1 className="font-display text-2xl font-semibold text-slate-50">Withdraw Earnings</h1>
        </div>
        <p className="text-sm text-slate-300">
          Request a payout and review transparent fee breakdown.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {/* Fee Breakdown Panel */}
          <div className="md:col-span-1 flex flex-col gap-4">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5">
              <h2 className="mb-3 text-xs font-semibold tracking-wide text-slate-200">
                Fee Breakdown
              </h2>
              <dl className="space-y-2 text-[11px]">
                <div className="flex justify-between">
                  <dt className="text-slate-400">Requested Amount</dt>
                  <dd className="text-slate-100">${val.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Withdrawal Fee (0%)</dt>
                  <dd className="text-slate-100">
                    ${withdrawalFee.toFixed(2)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">
                    Platform Commission (
                    {zeroCommission ? '0%' : '15%'})
                  </dt>
                  <dd className="text-slate-100">${commissionFee.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">
                    {methodType === 'paypal'
                      ? 'PayPal Processing (2.9% + $0.30)'
                      : 'Bank Transfer Fee'}
                  </dt>
                  <dd className="text-slate-100">${processorFee.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between border-t border-slate-800/70 pt-2">
                  <dt className="font-medium text-emerald-300">Estimated Net Payout</dt>
                  <dd className="font-semibold text-emerald-300">
                    ${netAfterFees.toFixed(2)}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-[10px] text-slate-500">
                All figures are estimates. Final processor fees may vary by currency and country.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5">
              <h2 className="mb-3 text-xs font-semibold tracking-wide text-slate-200">
                Balance Summary
              </h2>
              <div className="grid grid-cols-2 gap-3 text-center text-[11px]">
                <Metric label="Gross" value={`$${gross.toFixed(2)}`} />
                <Metric label="Completed" value={`$${completedTotal.toFixed(2)}`} />
                <Metric label="Pending" value={`$${pendingTotal.toFixed(2)}`} />
                <Metric label="Available" value={`$${available.toFixed(2)}`} />
              </div>
            </div>
          </div>

          {/* Withdrawal Form */}
          <div className="md:col-span-2 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-6">
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="text-[10px] font-semibold text-slate-400">
                  Withdrawal Method
                </label>
                <select
                  value={methodType}
                  onChange={(e) => setMethodType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-100"
                >
                  <option value="paypal">PayPal</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>

              {methodType === 'paypal' && (
                <div>
                  <label className="text-[10px] font-semibold text-slate-400">
                    PayPal Email
                  </label>
                  <input
                    value={paypalEmail}
                    onChange={(e) => setPaypalEmail(e.target.value)}
                    placeholder="you@paypal.com"
                    className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-100"
                  />
                </div>
              )}

              {methodType === 'bank' && (
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400">
                      Bank Name
                    </label>
                    <input
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="Bank of Example"
                      className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400">
                      Account Number
                    </label>
                    <input
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="XXXXXXXX"
                      className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400">
                      Account Type
                    </label>
                    <select
                      value={accountType}
                      onChange={(e) => setAccountType(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-100"
                    >
                      <option value="checking">Checking</option>
                      <option value="savings">Savings</option>
                      <option value="business">Business</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400">
                      Branch (optional)
                    </label>
                    <input
                      value={bankBranch}
                      onChange={(e) => setBankBranch(e.target.value)}
                      placeholder="Downtown Branch"
                      className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400">
                      Routing Number (optional)
                    </label>
                    <input
                      value={routingNumber}
                      onChange={(e) => setRoutingNumber(e.target.value)}
                      placeholder="000000000"
                      className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-100"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-semibold text-slate-400">
                  Amount (USD)
                </label>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="100"
                  className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-100"
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  Max: ${available.toFixed(2)} • Withdrawal Fee: $0.00
                </p>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-400">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-100"
                >
                  {['USD', 'EUR', 'GBP', 'CAD'].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-400">
                  Note (optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Extra instructions"
                  className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-100"
                />
              </div>

              <button
                disabled={
                  submitting ||
                  available <= 0 ||
                  parseFloat(amount) > available ||
                  parseFloat(amount) <= 0
                }
                className="w-full rounded-full bg-emerald-500 px-4 py-2 text-[12px] font-semibold text-slate-950 disabled:opacity-40"
              >
                {submitting ? 'Submitting...' : 'Submit Withdrawal'}
              </button>
            </form>
            {result && (
              <div className="mt-4 rounded-lg border border-slate-800/70 bg-slate-950/70 p-3 text-[11px] text-emerald-300">
                Request submitted #{result.id}. Redirecting…
              </div>
            )}
          </div>
        </div>

        <div className="mt-10 space-y-3">
          <h2 className="text-xs font-semibold text-slate-200">Withdrawal History</h2>
          {payouts.map((p) => {
            const fee = p.fee || 0
            const net = (p.amount - fee).toFixed(2)
            return (
              <div
                key={p.id}
                className="flex flex-col gap-1 rounded-lg border border-slate-800/70 bg-slate-900/70 p-3 text-[11px]"
              >
                <div className="flex justify-between">
                  <p className="font-medium text-slate-100">
                    ${p.amount} {p.currency}
                  </p>
                  <p
                    className={
                      p.status === 'completed'
                        ? 'text-emerald-300'
                        : p.status === 'cancelled'
                        ? 'text-red-300'
                        : 'text-yellow-300'
                    }
                  >
                    {p.status}
                  </p>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Fee: ${fee.toFixed(2)}</span>
                  <span>Net: ${net}</span>
                </div>
                {p.status === 'pending' && (
                  <button
                    onClick={async () => {
                      await cancelPayout(p.id)
                      setPayouts(await listUserPayouts(user.id))
                    }}
                    className="self-end mt-1 rounded-full border border-red-400/50 px-2 py-[2px] text-[10px] text-red-300 hover:bg-red-500/10"
                  >
                    Cancel
                  </button>
                )}
              </div>
            )
          })}
          {payouts.length === 0 && (
            <p className="text-[11px] text-slate-500">No withdrawal requests yet.</p>
          )}
        </div>

        <p className="mt-6 text-[10px] text-slate-500">
          Withdrawals are processed within 3 business days. Pending requests reduce available
          balance. Commission & processor fee estimates are informational and may vary.
        </p>
      </div>
    </section>
  )
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
      <p className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-sm font-semibold text-emerald-400">{value}</p>
    </div>
  )
}
