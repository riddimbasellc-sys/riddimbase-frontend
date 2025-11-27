import { useState } from 'react'
import useAdminCounts from '../hooks/useAdminCounts'
import { Link, useLocation } from 'react-router-dom'
import useSupabaseUser from '../hooks/useSupabaseUser'

const navItems = [
  { label: 'Dashboard', to: '/admin', icon: DashboardIcon },
  { label: 'Beats', to: '/admin/beats', icon: SparkIcon },
  { label: 'Users', to: '/admin/users', icon: UsersIcon },
  { label: 'Payouts', to: '/admin/payouts', icon: WalletIcon },
  { label: 'Coupons', to: '/admin/coupons', icon: TicketIcon },
  { label: 'Banners', to: '/admin/banners', icon: ImageIcon },
  { label: 'Playlists', to: '/admin/playlists', icon: PlaylistIcon },
  { label: 'Ads Manager', to: '/admin/ads', icon: AdsIcon },
  { label: 'Jobs', to: '/admin/jobs', icon: BriefcaseIcon },
  { label: 'Subscriptions', to: '/admin/subscriptions', icon: PlansIcon },
  { label: 'Announcements', to: '/admin/announcements', icon: BullhornIcon },
  { label: 'Email Blast', to: '/admin/email-blast', icon: MailIcon },
  { label: 'Plans', to: '/admin/plans', icon: PlansIcon },
  { label: 'Reports', to: '/admin/reports', icon: ReportIcon },
  { label: 'Tickets', to: '/admin/tickets', icon: TicketIcon },
  { label: 'Agents', to: '/admin/agents', icon: AgentIcon },
  { label: 'Footer Links', to: '/admin/footer-links', icon: LinkIcon },
  { label: 'Socials', to: '/admin/socials', icon: SocialIcon },
  { label: 'Analytics', to: '/admin/analytics', icon: SparkIcon },
  { label: 'Brand & Theme', to: '/admin/theme', icon: ImageIcon },
  { label: 'Email Templates', to: '/admin/email-templates', icon: MailIcon }
]

export default function AdminLayout({ title, subtitle, children, actions }) {
  const [open, setOpen] = useState(false)
  const { user } = useSupabaseUser()
  const location = useLocation()
  const { reportsOpen, ticketsOpen, payoutsPending, jobsPending } = useAdminCounts()

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
                  <span className="flex items-center gap-2">
                    {item.label}
                    {item.label === 'Reports' && reportsOpen > 0 && (
                      <span className="rounded-full border border-rose-400/60 bg-rose-500/10 px-2 py-[2px] text-[10px] font-semibold text-rose-300">{reportsOpen}</span>
                    )}
                    {item.label === 'Tickets' && ticketsOpen > 0 && (
                      <span className="rounded-full border border-amber-400/60 bg-amber-500/10 px-2 py-[2px] text-[10px] font-semibold text-amber-300">{ticketsOpen}</span>
                    )}
                    {item.label === 'Jobs' && jobsPending > 0 && (
                      <span className="rounded-full border border-emerald-400/60 bg-emerald-500/10 px-2 py-[2px] text-[10px] font-semibold text-emerald-300">{jobsPending}</span>
                    )}
                    {item.label === 'Payouts' && payoutsPending > 0 && (
                      <span className="rounded-full border border-violet-400/60 bg-violet-500/10 px-2 py-[2px] text-[10px] font-semibold text-violet-300">{payoutsPending}</span>
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
            <p className="mt-2 tracking-wide">Admin Panel</p>
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
function ImageIcon(props){return(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>)}
function WalletIcon(props){return(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M20 7H4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2Z"/><path d="M4 7h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z"/><path d="M16 12h.01"/></svg>)}
function SparkIcon(props){return(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/><path d="M6 17l2-2 4 4 6-6 2 2"/><path d="M14 3l7 7-7 7-7-7 7-7Z"/></svg>)}
function UsersIcon(props){return(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>)}
function TicketIcon(props){return(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 9V5a2 2 0 0 1 2-2h4"/><path d="M17 3h2a2 2 0 0 1 2 2v4"/><path d="M21 15v4a2 2 0 0 1-2 2h-2"/><path d="M9 21H5a2 2 0 0 1-2-2v-4"/><path d="M9 3h6v18H9Z"/><path d="M9 9h6M9 15h6"/></svg>)}
function BullhornIcon(props){return(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 11v2a4 4 0 0 0 4 4h1"/><path d="M3 11V9a4 4 0 0 1 4-4h1l11-3v18l-11-3H7a4 4 0 0 1-4-4"/><path d="M18 5v14"/><path d="M9 9v6"/></svg>)}
function PlansIcon(props){return(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>)}
function ReportIcon(props){return(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 3h12l6 6v12a2 2 0 0 1-2 2H3Z"/><path d="M15 3v6h6"/><path d="M9 14h6"/><path d="M9 17h3"/></svg>)}
function LinkIcon(props){return(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M10 13a5 5 0 0 1 7.54-1.54l1 1a5 5 0 0 1 0 7.07l-2 2a5 5 0 0 1-7.07 0l-1-1"/><path d="M14 11a5 5 0 0 1-7.54 1.54l-1-1a5 5 0 0 1 0-7.07l2-2a5 5 0 0 1 7.07 0l1 1"/></svg>)}
function AgentIcon(props){return(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="3"/><path d="M2 12h3"/><path d="M19 12h3"/><path d="M12 2v3"/><path d="M12 19v3"/><path d="M5 5l2.5 2.5"/><path d="M19 19l-2.5-2.5"/><path d="M5 19l2.5-2.5"/><path d="M19 5l-2.5 2.5"/></svg>)}
function MailIcon(props){return(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="M22 6l-10 7L2 6"/></svg>)}
function PlaylistIcon(props){return(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="12" y2="18"/><circle cx="18" cy="18" r="3"/></svg>)}
function AdsIcon(props){return(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="5" width="13" height="14" rx="2"/><path d="M16 9l5-2v8l-5-2"/><path d="M7 9h5"/><path d="M7 13h3"/></svg>)}
function SocialIcon(props){return(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="7" cy="12" r="3"/><circle cx="17" cy="6" r="2.5"/><circle cx="17" cy="18" r="2.5"/><path d="M9.5 10.8 14.5 7.2"/><path d="M9.5 13.2 14.5 16.8"/></svg>)}
function BriefcaseIcon(props){return(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3v2"/><path d="M3 12h18"/><path d="M12 12v3"/></svg>)}
