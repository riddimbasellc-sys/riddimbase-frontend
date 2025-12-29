import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export function ResetPassword() {
  const navigate = useNavigate()
  const location = useLocation()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [validRecovery, setValidRecovery] = useState(false)

  useEffect(() => {
    const search = new URLSearchParams(location.search)
    const hash = new URLSearchParams(location.hash.replace(/^#/, ''))
    const type = search.get('type') || hash.get('type')

    if (type === 'recovery') {
      setValidRecovery(true)
    } else {
      setError('This reset link is invalid or has already been used.')
    }
  }, [location.search, location.hash])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!validRecovery) return
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Password and confirmation do not match.')
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setMessage('Your password has been updated. You can now log in with your new password.')
      setPassword('')
      setConfirm('')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(err.message || 'Failed to update password. Try requesting a new reset link.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="bg-slate-950/95 min-h-[calc(100vh-120px)] flex items-center">
      <div className="mx-auto max-w-md w-full px-4 py-10">
        <h1 className="font-display text-2xl font-semibold text-slate-50">
          Reset your password
        </h1>
        <p className="mt-1 text-sm text-slate-300">
          Choose a new password for your RiddimBase account.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-200">
              New password
            </label>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/80 focus:outline-none"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-200">
              Confirm password
            </label>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/80 focus:outline-none"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
            />
          </div>
          {error && (
            <div className="rounded-md bg-red-500/10 border border-red-500/40 px-3 py-2">
              <p className="text-[11px] text-red-300 leading-relaxed">{error}</p>
            </div>
          )}
          {message && (
            <div className="rounded-md bg-emerald-500/10 border border-emerald-500/40 px-3 py-2">
              <p className="text-[11px] text-emerald-200 leading-relaxed">{message}</p>
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !validRecovery}
            className="w-full rounded-full bg-red-500 px-4 py-2 text-xs font-semibold text-slate-50 shadow-rb-soft hover:bg-red-400 transition disabled:opacity-60"
          >
            {loading ? 'Updating password…' : 'Update password'}
          </button>
        </form>
      </div>
    </section>
  )
}

export default ResetPassword
