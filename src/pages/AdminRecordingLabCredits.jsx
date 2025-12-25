import { useEffect, useMemo, useRef, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { useAdminRole } from '../hooks/useAdminRole'
import { fetchAdminUsers } from '../services/adminUsersRepository'
import {
  addAdminRecordingLabCredits,
  fetchAdminRecordingLabUser,
} from '../services/adminDashboardRepository'

// Admin panel: Recording Lab → Credit Management
export default function AdminRecordingLabCredits() {
  const { isAdmin, loading } = useAdminRole()

  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [balance, setBalance] = useState(null)
  const [transactions, setTransactions] = useState([])

  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const toastTimeoutRef = useRef(null)

  useEffect(() => {
    let active = true
    async function loadUsers() {
      try {
        const data = await fetchAdminUsers()
        if (!active) return
        setUsers(data)
      } catch {
        if (active) setUsers([])
      } finally {
        if (active) setLoadingUsers(false)
      }
    }
    loadUsers()
    return () => {
      active = false
    }
  }, [])

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users.slice(0, 20)
    return users
      .filter((u) => {
        const email = (u.email || '').toLowerCase()
        const id = (u.id || '').toLowerCase()
        return email.includes(q) || id.includes(q)
      })
      .slice(0, 20)
  }, [users, search])

  const showToast = (msg) => {
    setToast(msg)
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current)
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToast('')
    }, 2600)
  }

  const handleSelectUser = async (u) => {
    if (!u?.id) return
    setError('')
    setSelectedUserId(u.id)
    setSelectedUser(u)
    setLoadingDetails(true)
    setBalance(null)
    setTransactions([])
    try {
      const data = await fetchAdminRecordingLabUser(u.id)
      setBalance(typeof data.balance === 'number' ? data.balance : 0)
      if (Array.isArray(data.transactions)) {
        setTransactions(data.transactions)
      }
      if (data.user) {
        setSelectedUser((prev) => ({ ...prev, ...data.user }))
      }
    } catch (e) {
      setError(e.message || 'Failed to load Recording Lab balance for user')
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedUserId) {
      setError('Select a user first.')
      return
    }
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter a positive number of credits to add.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const payload = await addAdminRecordingLabCredits({
        userId: selectedUserId,
        amount: value,
        reason: reason.trim() || undefined,
      })
      if (typeof payload.balance === 'number') {
        setBalance(payload.balance)
      }
      if (payload.transaction) {
        setTransactions((prev) => [payload.transaction, ...prev].slice(0, 50))
      }
      setAmount('')
      setReason('')
      showToast('Bonus credits added and email sent (if enabled).')
    } catch (e) {
      setError(e.message || 'Failed to add credits')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-slate-950/95">
        <p className="text-sm text-slate-400">Loading admin access…</p>
      </section>
    )
  }

  if (!isAdmin) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-slate-950/95">
        <p className="text-sm text-slate-400">Access denied.</p>
      </section>
    )
  }

  return (
    <>
      <AdminLayout
        title="Recording Lab · Credit Management"
        subtitle="Manually grant bonus credits, view balances and audit recent usage."
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-1 rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 shadow-lg">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
              User lookup
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-100">
              Search by email or user ID
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Start typing to filter the latest Supabase auth users, then select a
              profile to inspect and grant credits.
            </p>
            <div className="mt-4">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users by email or ID…"
                className="w-full rounded-full border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-[13px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
              />
            </div>
            <div className="mt-3 max-h-80 overflow-y-auto rounded-xl border border-slate-800/80 bg-slate-950/80">
              {loadingUsers && (
                <p className="px-3 py-3 text-[11px] text-slate-500">
                  Loading users…
                </p>
              )}
              {!loadingUsers && filteredUsers.length === 0 && (
                <p className="px-3 py-3 text-[11px] text-slate-500">
                  No users match this search.
                </p>
              )}
              {!loadingUsers &&
                filteredUsers.map((u) => {
                  const active = selectedUserId === u.id
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleSelectUser(u)}
                      className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[11px] transition hover:bg-slate-900/80 ${
                        active
                          ? 'bg-slate-900/90 text-emerald-200'
                          : 'text-slate-200'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{u.email}</p>
                        <p className="truncate text-[10px] text-slate-500">
                          ID: {u.id}
                        </p>
                      </div>
                    </button>
                  )
                })}
            </div>
          </section>

          <section className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 shadow-lg">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
                Credit balance
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-100">
                Current Recording Lab credits for this user
              </p>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] text-slate-400">Selected user</p>
                  <p className="mt-1 text-sm font-semibold text-slate-50">
                    {selectedUser?.email || 'None selected'}
                  </p>
                  {selectedUser?.id && (
                    <p className="text-[10px] text-slate-500">ID: {selectedUser.id}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-slate-400">Current balance</p>
                  <p className="mt-1 text-2xl font-semibold text-emerald-300">
                    {balance == null ? '—' : balance.toLocaleString()}{' '}
                    <span className="text-xs text-slate-400">credits</span>
                  </p>
                  {loadingDetails && (
                    <p className="mt-1 text-[10px] text-slate-500">
                      Loading Recording Lab data…
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 shadow-lg">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
                Add bonus credits
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-100">
                One-off admin adjustments with email notification
              </p>
              <form
                className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end"
                onSubmit={handleSubmit}
              >
                <div>
                  <label className="text-[11px] text-slate-400">
                    Credits to add
+                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1 w-full rounded-full border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-[13px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
                    placeholder="e.g. 500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">
                    Reason (optional, shown in audit log)
                  </label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="mt-1 w-full rounded-full border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-[13px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
                    placeholder="e.g. Launch promo, contest prize, support gesture"
                  />
                </div>
                <div className="flex md:justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-4 inline-flex items-center justify-center rounded-full border border-emerald-400/70 bg-emerald-500/10 px-4 py-2 text-[13px] font-semibold text-emerald-200 shadow-sm transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60 md:mt-0"
                  >
                    {submitting ? 'Adding credits…' : 'Add Credits'}
                  </button>
                </div>
              </form>
              {error && (
                <p className="mt-3 text-[11px] text-rose-400">{error}</p>
              )}
              <p className="mt-3 text-[10px] text-slate-500">
                Every grant is logged in the Recording Lab credit history table
                with type <span className="font-semibold">admin_bonus</span>, so
                you can audit adjustments later.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 shadow-lg">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
                Recent credit activity
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-100">
                Recording Lab credit history for this user
              </p>
              <div className="mt-3 max-h-80 overflow-y-auto rounded-xl border border-slate-800/80 bg-slate-950/80">
                {transactions.length === 0 && (
                  <p className="px-3 py-3 text-[11px] text-slate-500">
                    No credit history for this user yet.
                  </p>
                )}
                {transactions.length > 0 && (
                  <table className="min-w-full text-[11px]">
                    <thead className="bg-slate-950/90 text-slate-400">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">When</th>
                        <th className="px-3 py-2 text-left font-medium">Type</th>
                        <th className="px-3 py-2 text-right font-medium">Amount</th>
                        <th className="px-3 py-2 text-left font-medium">Description</th>
                        <th className="px-3 py-2 text-right font-medium">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((t) => {
                        const amt = Number(t.amount) || 0
                        const date = t.createdAt
                          ? new Date(t.createdAt).toLocaleString()
                          : '—'
                        const type = t.type || 'unknown'
                        return (
                          <tr
                            key={t.id}
                            className="border-t border-slate-800/80 text-slate-200"
                          >
                            <td className="px-3 py-2 align-top text-slate-400">
                              {date}
                            </td>
                            <td className="px-3 py-2 align-top capitalize">
                              {type.replace(/_/g, ' ')}
                            </td>
                            <td className="px-3 py-2 align-top text-right tabular-nums">
                              {amt > 0 ? `+${amt}` : amt}
                            </td>
                            <td className="px-3 py-2 align-top text-slate-300">
                              {t.description || '—'}
                            </td>
                            <td className="px-3 py-2 align-top text-right tabular-nums text-slate-400">
                              {Number(t.balanceAfter || 0).toLocaleString()}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </section>
        </div>
      </AdminLayout>
      {toast && (
        <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full border border-emerald-400/70 bg-slate-950/95 px-4 py-2 text-[11px] font-medium text-emerald-200 shadow-lg">
          {toast}
        </div>
      )}
    </>
  )
}
