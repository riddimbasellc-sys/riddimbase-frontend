import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import countries from '../constants/countries'

export function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState('artist')
  const [country, setCountry] = useState('')
  const ACCOUNT_TYPES = [
    { value: 'mix-master engineer', label: 'Mix/Master Engineer' },
    { value: 'producer', label: 'Producer' },
    { value: 'beat maker', label: 'Beat Maker' },
    { value: 'artist', label: 'Artist' }
  ]
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  function friendlyError(msg) {
    if (!msg) return ''
    const lower = msg.toLowerCase()
    if (lower.includes('supabase not configured')) {
      return 'Sign up unavailable (Supabase env missing). Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local then restart.'
    }
    if (lower.includes('password')) {
      return 'Password must meet security rules (min length, complexity).'
    }
    return msg
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      setError(friendlyError(authError.message))
      setLoading(false)
      return
    }

    const user = authData.user
    if (user) {
      try {
        await supabase.from('profiles').upsert({
          id: user.id,
          role,
          display_name: displayName,
        })
      } catch (err) {
        console.warn('Supabase profile upsert failed (non-blocking)', err.message)
      }
      try {
        const extended = {
          country,
          phone: '',
          bio: '',
          website: '',
          instagram: '',
          twitterX: '',
          youtube: '',
          genres: [],
        }
        localStorage.setItem(`extendedProfile:${user.id}`, JSON.stringify(extended))
      } catch {
        // ignore localStorage failures
      }
    }

    setLoading(false)
    // You can route differently based on role if you want
    navigate('/producer/dashboard')
  }

  return (
    <section className="bg-slate-950/95 min-h-[calc(100vh-120px)] flex items-center">
      <div className="mx-auto max-w-md w-full px-4 py-10">
        <h1 className="font-display text-2xl font-semibold text-slate-50">
          Create your RiddimBase account
        </h1>
        <p className="mt-1 text-sm text-slate-300">
          Join as an artist or producer and start building with Caribbean sound.
        </p>
        <form onSubmit={handleSignup} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-200">
              Display name
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/80 focus:outline-none"
              placeholder="e.g. YaadWave"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-200">
              Email
            </label>
            <input
              type="email"
              className="mt-1 w-full rounded-xl border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/80 focus:outline-none"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-200">
              Password
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
              Country
            </label>
            <select
              className="mt-1 w-full rounded-xl border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400/80 focus:outline-none"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              required
            >
              <option value="">Select country</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-200">Select what best describes you</label>
            <select
              value={role}
              onChange={e=>setRole(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 focus:border-emerald-400/80 focus:outline-none"
            >
              {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <p className="mt-1 text-[10px] text-slate-500">Used to tailor dashboards & recommendations.</p>
          </div>
          {error && (
            <div className="rounded-md bg-red-500/10 border border-red-500/40 px-3 py-2">
              <p className="text-[11px] text-red-300 leading-relaxed">{error}</p>
            </div>
          )}
          {!error && !loading && email && (
            <p className="text-[10px] text-slate-400">After signing up you may need to verify your email before logging in if confirmations are enabled.</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-rb-soft hover:bg-emerald-400 transition disabled:opacity-60"
          >
            {loading ? 'Creating account…' : 'Sign up'}
          </button>
          <p className="text-[11px] text-slate-400">
            Already have an account?{' '}
            <a href="/login" className="text-emerald-300 hover:text-emerald-200">
              Log in
            </a>
          </p>
        </form>
      </div>
    </section>
  )
}

export default Signup
