import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import useSupabaseUser from '../hooks/useSupabaseUser'
import useUnreadMessages from '../hooks/useUnreadMessages'

const navItems = [
  { label: 'Dashboard', to: '/producer/dashboard', icon: DashboardIcon },
  { label: 'Upload Beat', to: '/producer/upload', icon: UploadIcon },
  { label: 'Licenses', to: '/producer/licenses', icon: LicenseIcon },
  { label: 'Withdraw', to: '/producer/withdraw', icon: WalletIcon },
  { label: 'Inbox', to: '/producer/inbox', icon: InboxIcon },
  { label: 'Producer Pro', to: '/producer/pro', icon: SparkIcon }
]

export default function ProducerLayout({ title, subtitle, children, actions }) {
  const [open, setOpen] = useState(false)
  const { user } = useSupabaseUser()
  const { unread } = useUnreadMessages(user?.id)
  const location = useLocation()

  return (
    <div className="min-h-screen bg-slate-950/95 flex">
      <aside className={`fixed inset-y-0 left-0 z-40 w-60 transform bg-slate-950/95 border-r border-slate-900/80 transition-transform duration-300 md:static md:translate-x-0 ${open? 'translate-x-0':'-translate-x-full'}`}>
        <div className="flex h-full flex-col">
          <div className="px-5 pt-5 pb-4 border-b border-slate-900/80">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold text-lg tracking-tight">RiddimBase</span>
            </Link>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map(item => {
              const active = location.pathname === item.to
              const Icon = item.icon
              return (
                <Link key={item.to} to={item.to} onClick={() => setOpen(false)} className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${active? 'bg-slate-900/90 text-emerald-300 border border-slate-800/80':'text-slate-300 hover:bg-slate-900/50'}`}>
                  <Icon className={`h-4 w-4 ${active? 'text-emerald-300':'text-slate-500 group-hover:text-slate-300'}`} />
                  <span className="flex items-center gap-2">{item.label}
                    {item.label==='Inbox' && unread>0 && (
                      <span className="rounded-full border border-emerald-400/60 bg-emerald-500/10 px-2 py-[2px] text-[10px] font-semibold text-emerald-300">{unread}</span>
                    )}
                  </span>
                </Link>
              )
            })}
          </nav>
          <div className="px-4 py-4 border-t border-slate-900/80 text-[11px] text-slate-400">
            {user && (
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] font-semibold text-emerald-300">{(user.user_metadata?.display_name || user.email || 'U').slice(0,2).toUpperCase()}</div>
                <div className="truncate max-w-[9rem]">{user.user_metadata?.display_name || user.email}</div>
              </div>
            )}
            <p className="mt-2 tracking-wide">Producer Panel</p>
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="sticky top-0 z-30 backdrop-blur bg-slate-950/70 border-b border-slate-900/80">
          <div className="mx-auto max-w-7xl px-4 py-4 flex items-center gap-4">
            <button className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800/80 text-slate-300 hover:text-emerald-300 hover:border-emerald-400/50" onClick={() => setOpen(v=>!v)} aria-label="Toggle navigation">
              <MenuIcon className="h-5 w-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-lg font-semibold text-slate-50 truncate">{title}</h1>
              {subtitle && <p className="mt-0.5 text-[11px] text-slate-400 truncate">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-8">
          {children}
        </main>
      </div>
    </div>
  )
}

function MenuIcon(props){return(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>)}
function DashboardIcon(props){return(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="10" width="7" height="11"/><rect x="3" y="14" width="7" height="7"/></svg>)}
function UploadIcon(props){return(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><polyline points="7 9 12 4 17 9"/><line x1="12" y1="4" x2="12" y2="16"/></svg>)}
function WalletIcon(props){return(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M20 7H4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2Z"/><path d="M4 7h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z"/><path d="M16 12h.01"/></svg>)}
function SparkIcon(props){return(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/><path d="M6 17l2-2 4 4 6-6 2 2"/><path d="M14 3l7 7-7 7-7-7 7-7Z"/></svg>)}
function InboxIcon(props){return(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 3h18v13a2 2 0 0 1-2 2h-4l-2 3-2-3H5a2 2 0 0 1-2-2V3Z"/><path d="M7 8h10"/><path d="M7 12h5"/></svg>)}
function LicenseIcon(props){return(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8"/><path d="M8 11h5"/><path d="M8 15h4"/></svg>)}
