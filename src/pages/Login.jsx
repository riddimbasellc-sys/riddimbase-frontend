import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login as apiLogin } from '../services/authService'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  function friendlyError(msg) {
    if (!msg) return ''
    const lower = msg.toLowerCase()
    if (lower.includes('invalid login credentials')) {
      return 'Invalid credentials. Check email & password. If you just signed up and email confirmations are enabled, verify your email first.'
    }
    if (lower.includes('supabase not configured')) {
      return 'Auth service not configured. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY exist, and backend auth is deployed.'
    }
    return msg
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await apiLogin(email, password)
      console.log('Logged in user:', data.user)
      setLoading(false)

      const ownerEmail = import.meta.env.VITE_OWNER_EMAIL
      const isAdmin = data?.user?.email && ownerEmail && data.user.email === ownerEmail
      if (isAdmin) {
        navigate('/admin')
      } else {
        navigate('/producer/dashboard')
      }
    } catch (err) {
      setError(friendlyError(err.message))
      setLoading(false)
    }
  }

  return (
    <section className="bg-slate-950/95 min-h-[calc(100vh-120px)] flex items-center">
      <div className="mx-auto max-w-md w-full px-4 py-10">
        <h1 className="font-display text-2xl font-semibold text-slate-50">
          Log in to RiddimBase
        </h1>
        <p className="mt-1 text-sm text-slate-300">
          Access your beats, purchases and dashboards.
        </p>
        <form onSubmit={handleLogin} className="mt-6 space-y-4">
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
          {error && (
            <div className="rounded-md bg-red-500/10 border border-red-500/40 px-3 py-2">
              <p className="text-[11px] text-red-300 leading-relaxed">{error}</p>
              {error.toLowerCase().includes('auth service not configured') && (
                <p className="mt-1 text-[10px] text-red-200/80">Create a .env.local file with your Supabase keys and restart: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.</p>
              )}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-red-500 px-4 py-2 text-xs font-semibold text-slate-50 shadow-rb-soft hover:bg-red-400 transition disabled:opacity-60"
          >
            {loading ? 'Logging in…' : 'Log in'}
          </button>
          <p className="text-[11px] text-slate-400">
            Don&apos;t have an account?{' '}
            <a href="/signup" className="text-red-300 hover:text-red-200">
              Sign up
            </a>
          </p>
        </form>
      </div>
    </section>
  )
}

export default Login
