import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AnnouncementRotator from './AnnouncementRotator'
import { getAnnouncements, getRotationInterval } from '../services/announcementService'
import useSupabaseUser from '../hooks/useSupabaseUser'
import useUserProfile from '../hooks/useUserProfile'
import { useAdminRole } from '../hooks/useAdminRole'
import { useCart } from '../context/CartContext'
import CartPanel from './CartPanel'
import { supabase } from '../lib/supabaseClient'
import { loadTawk } from '../services/tawkService'

export function Layout({ children }) {
  const [announcements, setAnnouncements] = useState([])
  const [intervalSec, setIntervalSec] = useState(3)
  const [mainMenuOpen, setMainMenuOpen] = useState(false)

  useEffect(() => {
    async function load() {
      const [list, interval] = await Promise.all([
        getAnnouncements(),
        getRotationInterval(),
      ])
      setAnnouncements(list || [])
      setIntervalSec(interval || 3)
    }

    load()
  }, [])

  useEffect(() => {
    loadTawk()
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden bg-rb-caribbean text-slate-50 flex flex-col">
      {/* Announcement bar fixed at very top, above navbar */}
      {announcements.length > 0 && (
        <div className="w-full border-b border-rb-sun-gold/50 bg-slate-950/70 backdrop-blur-md shadow-rb-gloss-panel">
          <div className="mx-auto flex w-full max-w-7xl px-4 py-1.5">
            <AnnouncementRotator
              announcements={announcements}
              intervalSec={intervalSec}
              className="w-full"
            />
          </div>
        </div>
      )}
      <Navbar onMobileMenuToggle={() => setMainMenuOpen((v) => !v)} />
      <main className="relative flex-1 pb-20 md:pb-0">
        {children}
      </main>
      <MobileBottomNav />
      {mainMenuOpen && <MobileMainMenuSheet onClose={() => setMainMenuOpen(false)} />}
      <Footer />
    </div>
  )
}

function HelpBubble() {
  const [open, setOpen] = useState(false)
  const whatsappHref = 'https://wa.me/18762797956'

  return (
    <div className="pointer-events-none fixed bottom-20 right-4 z-40 md:bottom-5 md:right-5">
      {open && (
        <div className="pointer-events-auto mb-3 w-56 rounded-2xl border border-slate-800/80 bg-slate-950/95 p-3 shadow-rb-gloss-panel">
          <p className="text-[11px] font-semibold text-slate-100 mb-2">Need a hand?</p>
          <div className="space-y-2">
            <Link
              to="/support/general?ticket=1"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-xl border border-slate-700/70 bg-slate-900/80 px-3 py-2 text-[11px] font-medium text-slate-100 hover:border-emerald-400/70 hover:text-emerald-300 transition"
            >
              <span>Create support ticket</span>
              <span className="text-xs">→</span>
            </Link>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-xl bg-[#25D366] px-3 py-2 text-[11px] font-semibold text-slate-950 hover:bg-[#1ebe5a] transition"
              onClick={() => setOpen(false)}
            >
              <span>Chat on WhatsApp</span>
              <span className="inline-flex h-4 w-4 items-center justify-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M12.04 2A9.9 9.9 0 0 0 2 11.93a9.8 9.8 0 0 0 1.35 5l-1.4 5.1 5.2-1.36A10 10 0 1 0 12.04 2Zm0 2a8 8 0 0 1 0 16 8.1 8.1 0 0 1-4.08-1.1l-.3-.18-3 0.8 0.8-2.9-.2-.31A7.9 7.9 0 0 1 4 11.93 8 8 0 0 1 12.04 4Zm-3 3.3c-.2 0-.5 0-.7.4-.2.5-.7 1.4-.7 2.3s.5 2 1.1 2.7 1.6 1.7 3.1 2.3c1.5.6 2 .5 2.4.4.4 0 1.3-.5 1.4-1s.1-1 .1-1-.1-.1-.3-.2l-1.4-.7c-.2-.1-.4-.2-.6 0l-.5.6c-.1.1-.3.2-.5.1-.2-.1-.9-.3-1.7-1.1-.6-.5-1-1.5-1.1-1.7-.1-.2 0-.3.1-.4l.4-.5c.1-.2.1-.3 0-.5l-.6-1.5C12 7.4 11.9 7.3 11.8 7.3Z" />
                </svg>
              </span>
            </a>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-red-500 text-slate-50 shadow-rb-gloss-btn hover:bg-red-400 transition"
        aria-label="Help me"
      >
        ?
      </button>
    </div>
  )
}

function TawkBubble() {
  return (
    <div className="pointer-events-none fixed bottom-20 right-4 z-40 md:bottom-5 md:right-5">
      <button
        type="button"
        onClick={() => openTawk()}
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-[11px] font-semibold text-slate-50 shadow-rb-gloss-btn hover:bg-red-400 transition"
        aria-label="Chat with us"
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/40">
          <span className="text-base leading-none">💬</span>
        </span>
        <span>Chat with us</span>
      </button>
    </div>
  )
}

function MobileBottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useSupabaseUser()
  const { isAdmin } = useAdminRole()
  const { count } = useCart() || { count: 0 }
  const [cartOpen, setCartOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  // Only show bottom bar for logged-in users, on mobile sizes
  if (!user) return null

  const path = location.pathname || ''

  const go = (to) => {
    navigate(to)
  }

  if (isAdmin) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-800 bg-slate-950/95 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-around px-4 py-2">
          <button
            type="button"
            onClick={() => go('/admin')}
            className="flex flex-col items-center gap-1 text-[11px] font-medium"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-rb-sun-gold text-slate-950">
              A
            </span>
            <span className="text-slate-200">Admin</span>
          </button>
        </div>
      </div>
    )
  }

  const isActive = (match) => {
    if (match === '/') return path === '/'
    return path.startsWith(match)
  }

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-800 bg-slate-950/95 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-2 text-[11px] font-medium text-slate-300">
          <button
            type="button"
            onClick={() => go('/')}
            className={`flex flex-1 flex-col items-center gap-0.5 ${isActive('/') ? 'text-emerald-400' : ''}`}
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800/90">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" stroke="currentColor" fill="none" strokeWidth="2">
                <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 10.5V20h5v-4h4v4h5v-9.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span>Home</span>
          </button>
          <button
            type="button"
            onClick={() => go('/beats')}
            className={`flex flex-1 flex-col items-center gap-0.5 ${isActive('/beats') ? 'text-emerald-400' : ''}`}
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800/90">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" stroke="currentColor" fill="none" strokeWidth="2">
                <rect x="4" y="4" width="4" height="16" rx="1" />
                <rect x="10" y="8" width="4" height="12" rx="1" />
                <rect x="16" y="6" width="4" height="14" rx="1" />
              </svg>
            </span>
            <span>Beats</span>
          </button>
          <button
            type="button"
            onClick={() => go('/services')}
            className={`flex flex-1 flex-col items-center gap-0.5 ${isActive('/services') ? 'text-emerald-400' : ''}`}
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800/90">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" stroke="currentColor" fill="none" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M4.5 9a7.5 7.5 0 0 1 15 0c0 5.25-7.5 10.5-7.5 10.5S4.5 14.25 4.5 9Z" />
              </svg>
            </span>
            <span>Services</span>
          </button>
          <button
            type="button"
            onClick={() => go('/jobs')}
            className={`flex flex-1 flex-col items-center gap-0.5 ${isActive('/jobs') ? 'text-emerald-400' : ''}`}
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800/90">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" stroke="currentColor" fill="none" strokeWidth="2">
                <rect x="3" y="7" width="18" height="13" rx="2" />
                <path d="M9 7V5a3 3 0 0 1 6 0v2" />
              </svg>
            </span>
            <span>Jobs</span>
          </button>
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className={`flex flex-1 flex-col items-center gap-0.5 ${profileOpen ? 'text-emerald-400' : ''}`}
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800/90">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" stroke="currentColor" fill="none" strokeWidth="2">
                <circle cx="12" cy="8" r="3" />
                <path d="M5 20c1.5-3 3.5-4.5 7-4.5s5.5 1.5 7 4.5" />
              </svg>
            </span>
            <span>Profile</span>
          </button>
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className={`flex flex-1 flex-col items-center gap-0.5 ${cartOpen ? 'text-emerald-400' : ''}`}
          >
            <span className="relative inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800/90">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" stroke="currentColor" fill="none" strokeWidth="2">
                <path d="M6 8l2-4h8l2 4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3 8h18l-1.5 11a2 2 0 0 1-2 1.8H6.5a2 2 0 0 1-2-1.8L3 8z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {count > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold text-slate-950">
                  {count}
                </span>
              )}
            </span>
            <span>Cart</span>
          </button>
        </div>
      </div>
      {cartOpen && <CartPanel onClose={() => setCartOpen(false)} />}
      {profileOpen && <MobileProfileSheet onClose={() => setProfileOpen(false)} />}
    </>
  )
}

function MobileMainMenuSheet({ onClose }) {
  const { user } = useSupabaseUser()
  const { isAdmin } = useAdminRole()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    onClose()
    navigate('/')
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={onClose}>
      <div
        className="absolute inset-x-0 top-[56px] max-h-[80vh] rounded-b-3xl border border-slate-800/80 bg-slate-950/98 p-4 shadow-rb-gloss-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <nav className="mx-auto max-w-6xl space-y-1 text-sm font-medium text-slate-200 overflow-y-auto">
          {isAdmin ? (
            <button
              type="button"
              onClick={() => {
                onClose()
                navigate('/admin')
              }}
              className="block w-full rounded-lg px-2 py-2 text-left hover:bg-slate-900/90"
            >
              Admin
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  navigate('/')
                }}
                className="block w-full rounded-lg px-2 py-2 text-left hover:bg-slate-900/90"
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  navigate('/beats')
                }}
                className="block w-full rounded-lg px-2 py-2 text-left hover:bg-slate-900/90"
              >
                Beats
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  navigate('/soundkits')
                }}
                className="block w-full rounded-lg px-2 py-2 text-left hover:bg-slate-900/90"
              >
                Soundkits
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  navigate('/producers')
                }}
                className="block w-full rounded-lg px-2 py-2 text-left hover:bg-slate-900/90"
              >
                Producers
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  navigate('/services')
                }}
                className="block w-full rounded-lg px-2 py-2 text-left hover:bg-slate-900/90"
              >
                Services
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  navigate('/jobs')
                }}
                className="block w-full rounded-lg px-2 py-2 text-left hover:bg-slate-900/90"
              >
                Jobs
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  navigate('/pricing')
                }}
                className="block w-full rounded-lg px-2 py-2 text-left hover:bg-slate-900/90"
              >
                Pricing
              </button>
            </>
          )}
          {!user ? (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose()
                  navigate('/login')
                }}
                className="flex-1 rounded-full border border-slate-700/80 px-3 py-1.5 text-[12px] font-medium text-slate-200"
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  navigate('/signup')
                }}
                className="flex-1 rounded-full bg-red-500 px-3 py-1.5 text-[12px] font-semibold text-slate-50"
              >
                Sign up
              </button>
            </div>
          ) : (
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-red-500/70 px-3 py-1.5 text-[11px] font-semibold text-red-300 hover:bg-red-500/10"
              >
                Log out
              </button>
            </div>
          )}
        </nav>
      </div>
    </div>
  )
}

function MobileProfileSheet({ onClose }) {
  const { user } = useSupabaseUser()
  const { profile } = useUserProfile()
  const { isAdmin } = useAdminRole()
  const navigate = useNavigate()
  const producerLike = ['producer','beat maker','mix-master engineer','hybrid']
  const artistLike = ['artist','hybrid']
  const roleTokens = (profile?.accountType || '').split('+')
  const hasProducer = roleTokens.some(r => producerLike.includes(r))
  const hasArtist = roleTokens.some(r => artistLike.includes(r))

  if (!user) return null

  return (
    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={onClose}>
      <div
        className="absolute inset-x-0 bottom-0 max-h-[80vh] rounded-t-3xl border border-slate-800/80 bg-slate-950/98 p-4 shadow-rb-gloss-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-slate-700/70 bg-slate-800/70">
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="avatar" className="h-full w-full object-cover" />
            ) : (
              <span className="text-[11px] font-semibold text-slate-300">
                {(profile?.displayName || user.email).slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex flex-col">
            <span className="max-w-[180px] truncate text-[11px] font-medium text-slate-200">
              {profile?.displayName || user.email}
            </span>
            <button
              type="button"
              onClick={() => {
                onClose()
                navigate('/profile/edit')
              }}
              className="text-[10px] text-emerald-300 underline-offset-2 hover:underline"
            >
              View profile
            </button>
          </div>
        </div>
        <div className="mt-3 space-y-1 text-[12px] font-medium text-slate-200">
          <button
            onClick={() => {
              onClose()
              navigate('/favorites')
            }}
            className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left hover:bg-slate-900/90"
          >
            <span>Favorites</span>
          </button>
          {hasProducer && (
            <button
              onClick={() => {
                onClose()
                navigate('/producer/dashboard')
              }}
              className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left hover:bg-slate-900/90"
            >
              <span>My Dashboard</span>
            </button>
          )}
          {hasArtist && (
            <button
              onClick={() => {
                onClose()
                navigate('/artist/dashboard')
              }}
              className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left hover:bg-slate-900/90"
            >
              <span>Artist Dashboard</span>
            </button>
          )}
          {hasProducer && (
            <button
              onClick={() => {
                onClose()
                navigate('/producer/upload')
              }}
              className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left hover:bg-slate-900/90"
            >
              <span>Upload Beat</span>
            </button>
          )}
          {hasProducer && (
            <button
              onClick={() => {
                onClose()
                navigate('/my-ads')
              }}
              className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left hover:bg-slate-900/90"
            >
              <span>My Ads</span>
            </button>
          )}
          {hasProducer && (
            <button
              onClick={() => {
                onClose()
                navigate('/services/manage')
              }}
              className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left hover:bg-slate-900/90"
            >
              <span>My Services</span>
            </button>
          )}
          <button
            onClick={() => {
              onClose()
              navigate('/chat')
            }}
            className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left hover:bg-slate-900/90"
          >
            <span>Chat</span>
          </button>
          <button
            onClick={() => {
              onClose()
              navigate('/pricing')
            }}
            className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left hover:bg-slate-900/90"
          >
            <span>Manage Plan</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => {
                onClose()
                navigate('/admin')
              }}
              className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left hover:bg-slate-900/90"
            >
              <span>Admin</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
