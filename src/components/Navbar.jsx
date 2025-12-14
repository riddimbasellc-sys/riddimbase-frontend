import { supabase } from '../lib/supabaseClient'
import useSupabaseUser from '../hooks/useSupabaseUser'
import { useAdminRole } from '../hooks/useAdminRole'
import useUserPlan from '../hooks/useUserPlan'
import useUserProfile from '../hooks/useUserProfile'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link, NavLink } from 'react-router-dom'
import { useCart } from '../context/CartContext'
// Announcement banner handled globally in Layout via rotator; legacy single announcement removed.
import CartPanel from './CartPanel'
import NotificationsBell from './NotificationsBell'

export function Navbar({ onMobileMenuToggle = () => {} }) {
  const { user } = useSupabaseUser()
  const { plan } = useUserPlan()
  const { profile } = useUserProfile()
  const producerLike = ['producer','beat maker','mix-master engineer','hybrid']
  const artistLike = ['artist','hybrid']
  const roleTokens = (profile?.accountType || '').split('+')
  const hasProducer = roleTokens.some(r => producerLike.includes(r))
  const hasArtist = roleTokens.some(r => artistLike.includes(r))
  const { isAdmin } = useAdminRole()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const menuRef = useRef(null)
  const { count } = useCart() || { count: 0 }

  useEffect(() => {
    const onDocClick = (e) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }
  return (
    <header className="sticky top-0 z-40 border-b border-slate-900/70 bg-slate-950/80 backdrop-blur-md shadow-rb-gloss-panel">
      <div className="mx-auto max-w-6xl px-4 py-3 md:py-4">
        {/* Mobile row: hamburger + centered logo */}
        <div className="flex items-center justify-between md:hidden">
          <button
            type="button"
            onClick={onMobileMenuToggle}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700/70 bg-slate-900/80 text-slate-200 hover:border-emerald-400/70 hover:text-emerald-300 transition"
            aria-label="Open navigation"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-4 w-4"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
            </svg>
          </button>
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 via-red-600 to-amber-400 shadow-rb-gloss-btn">
              <span className="text-lg font-black tracking-tight text-white drop-shadow-rb-glow">RB</span>
            </div>
            <div className="font-display text-lg font-semibold tracking-tight">
              RiddimBase
            </div>
          </Link>
          <div className="flex h-9 w-9 items-center justify-center">
            <NotificationsBell />
          </div>
        </div>

        {/* Desktop row */}
        <div className="hidden items-center justify-between md:flex">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 via-red-600 to-amber-400 shadow-rb-gloss-btn">
              <span className="text-lg font-black tracking-tight text-white drop-shadow-rb-glow">RB</span>
            </div>
            <div className="leading-tight">
              <div className="font-display text-lg font-semibold tracking-tight">RiddimBase</div>
              <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-300/80">
                Home of Caribbean Beats
              </div>
            </div>
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium text-slate-300">
            {isAdmin ? (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `hover:text-emerald-400 ${isActive ? 'text-emerald-400' : ''}`
                }
              >
                Admin
              </NavLink>
            ) : (
              <>
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `hover:text-emerald-400 ${isActive ? 'text-emerald-400' : ''}`
                  }
                >
                  Home
                </NavLink>
                {user && (
                  <NavLink
                    to="/feed"
                    className={({ isActive }) =>
                      `hover:text-emerald-400 ${isActive ? 'text-emerald-400' : ''}`
                    }
                  >
                    My Feed
                  </NavLink>
                )}
                <NavLink
                  to="/beats"
                  className={({ isActive }) =>
                    `hover:text-emerald-400 ${isActive ? 'text-emerald-400' : ''}`
                  }
                >
                  Beats
                </NavLink>
                <NavLink to="/soundkits" className={({ isActive }) => `hover:text-emerald-400 ${isActive ? 'text-emerald-400' : ''}`}>Soundkits</NavLink>
                <NavLink to="/producers" className={({ isActive }) => `hover:text-emerald-400 ${isActive ? 'text-emerald-400' : ''}`}>Producers</NavLink>
                <NavLink to="/services" end className={({ isActive }) => `hover:text-emerald-400 ${isActive ? 'text-emerald-400' : ''}`}>Services</NavLink>
                <NavLink to="/jobs" className={({ isActive }) => `hover:text-emerald-400 ${isActive ? 'text-emerald-400' : ''}`}>Jobs</NavLink>
                <NavLink to="/pricing" className={({ isActive }) => `hover:text-emerald-400 ${isActive ? 'text-emerald-400' : ''}`}>Pricing</NavLink>
              </>
            )}
          </nav>
          <div className="flex items-center gap-3" ref={menuRef}>
            <NotificationsBell />
            {!isAdmin && (
              <button onClick={()=>setCartOpen(o=>!o)} className="relative flex h-10 w-10 items-center justify-center text-slate-300 hover:text-emerald-400 transition" aria-label="Cart">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5 text-slate-300">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 8l2-4h8l2 4" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8h18l-1.5 11a2 2 0 01-2 1.8H6.5a2 2 0 01-2-1.8L3 8z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12v2m6-2v2" />
                </svg>
                {count>0 && <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-slate-950">{count}</span>}
              </button>
            )}
            {!user && (
              <>
                <a href="/login" className="rounded-full border border-slate-700/80 px-4 py-1.5 text-xs font-medium text-slate-200">Log in</a>
                <a href="/signup" className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-slate-950">Sign up</a>
              </>
            )}
            {user && (
              <>
                <button
                  onClick={()=>setOpen(o=>!o)}
                  className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-700/70 bg-slate-800/70"
                >
                  {profile?.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-300">
                      {(profile?.displayName || user.email).slice(0,2).toUpperCase()}
                    </span>
                  )}
                </button>
                {open && (
                  <div className="absolute right-4 top-[62px] w-56 rounded-2xl border border-slate-800/70 bg-slate-900/90 p-3 shadow-xl">
                    <div className="mb-2 px-2 text-[11px] text-slate-400">Signed in as <span className="font-medium text-slate-200">{profile?.displayName || user.email}</span></div>
                    <ul className="space-y-1 text-[12px] font-medium text-slate-200">
                      <li><button onClick={()=>{navigate('/profile/edit'); setOpen(false)}} className="w-full rounded-lg px-2 py-1 text-left hover:bg-slate-800/80">Edit Profile</button></li>
                      {hasProducer && (
                    <li><button onClick={()=>{navigate('/producer/dashboard'); setOpen(false)}} className="w-full rounded-lg px-2 py-1 text-left hover:bg-slate-800/80">My Dashboard</button></li>
                      )}
                      {hasProducer && (
                        <li><button onClick={()=>{navigate('/my-ads'); setOpen(false)}} className="w-full rounded-lg px-2 py-1 text-left hover:bg-slate-800/80">My Ads</button></li>
                      )}
                      <li><button onClick={()=>{navigate('/favorites'); setOpen(false)}} className="w-full rounded-lg px-2 py-1 text-left hover:bg-slate-800/80">Favorites</button></li>
                      {hasArtist && (
                        <li><button onClick={()=>{navigate('/artist/dashboard'); setOpen(false)}} className="w-full rounded-lg px-2 py-1 text-left hover:bg-slate-800/80">Artist Dashboard</button></li>
                      )}
                      {hasProducer && (
                        <li><button onClick={()=>{navigate('/producer/upload'); setOpen(false)}} className="w-full rounded-lg px-2 py-1 text-left hover:bg-slate-800/80">Upload Beat</button></li>
                      )}
                      <li><button onClick={()=>{navigate('/pricing'); setOpen(false)}} className="w-full rounded-lg px-2 py-1 text-left hover:bg-slate-800/80">Manage Plan</button></li>
                      {hasProducer && (
                        <li><button onClick={()=>{navigate('/services/manage'); setOpen(false)}} className="w-full rounded-lg px-2 py-1 text-left hover:bg-slate-800/80">My Services</button></li>
                      )}
                      <li><button onClick={()=>{handleLogout(); setOpen(false)}} className="w-full rounded-lg px-2 py-1 text-left text-red-300 hover:bg-red-500/10">Log out</button></li>
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
          {cartOpen && <CartPanel onClose={()=>setCartOpen(false)} />}
        </div>
      </div>
    </header>
  )
}
