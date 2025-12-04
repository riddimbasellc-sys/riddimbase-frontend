import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminRole } from '../hooks/useAdminRole'
import BackButton from '../components/BackButton'
import {
  fetchAdminUsers,
  banAdminUser,
  approveAdminProducer,
  resetAdminPassword,
} from '../services/adminUsersRepository'

export function AdminUsers() {
  const { isAdmin, loading } = useAdminRole()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const data = await fetchAdminUsers()
        if (!active) return
        setUsers(data)
      } catch {
        setUsers([])
      } finally {
        if (active) setDataLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  if (loading || dataLoading) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-slate-950/95">
        <p className="text-sm text-slate-400">Loadingƒ?İ</p>
      </section>
    )
  }

  if (!isAdmin) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-slate-950/95">
        <p className="text-sm text-slate-400">Access denied.</p>
      </section>
    )
  }

  const handleBan = async (id) => {
    try {
      await banAdminUser(id)
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, banned: true } : u)),
      )
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e.message || 'Failed to ban user')
    }
  }

  const handleApproveProducer = async (id) => {
    try {
      await approveAdminProducer(id)
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, producer: true } : u)),
      )
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e.message || 'Failed to approve producer')
    }
  }

  const handleViewProfile = (id) => {
    if (!id) return
    navigate(`/producer/${id}`)
  }

  return (
    <section className="bg-slate-950/95">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="font-display text-2xl font-semibold text-slate-50">
            Manage Users
          </h1>
        </div>
        <p className="mt-1 text-sm text-slate-300">
          Live Supabase users with moderation controls and quick profile access.
        </p>
        <div className="mt-6 space-y-3">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex flex-col gap-2 rounded-xl border border-slate-800/80 bg-slate-900/80 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-slate-100">
                  {u.email}{' '}
                  {u.banned && (
                    <span className="ml-1 rounded-full bg-red-600/20 px-2 py-0.5 text-[10px] text-red-400">
                      Banned
                    </span>
                  )}{' '}
                  {u.producer && !u.banned && (
                    <span className="ml-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                      Producer
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-slate-400">ID: {u.id}</p>
                {u.createdAt && (
                  <p className="text-[10px] text-slate-500">
                    Joined:{' '}
                    {new Date(u.createdAt).toLocaleDateString()}
                    {u.lastSignInAt && (
                      <>
                        {' '}
                        ƒ?› Last sign-in:{' '}
                        {new Date(u.lastSignInAt).toLocaleDateString()}
                      </>
                    )}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleViewProfile(u.id)}
                  className="rounded-full border border-slate-700/70 bg-slate-800/80 px-3 py-1 text-slate-200 hover:border-rb-sun-gold/70 hover:text-rb-sun-gold"
                >
                  View Profile
                </button>
                {!u.banned && (
                  <button
                    onClick={() => handleBan(u.id)}
                    className="rounded-full border border-red-600/50 px-3 py-1 text-red-400 hover:bg-red-600/10"
                  >
                    Ban
                  </button>
                )}
                {!u.producer && !u.banned && (
                  <button
                    onClick={() => handleApproveProducer(u.id)}
                    className="rounded-full border border-emerald-500/60 px-3 py-1 text-emerald-300 hover:bg-emerald-500/10"
                  >
                    Approve Producer
                  </button>
                )}
                <button
                  onClick={async () => {
                    try {
                      await resetAdminPassword(u.id)
                      // eslint-disable-next-line no-alert
                      alert(
                        'Password reset email sent (if email templates are configured in Supabase).',
                      )
                    } catch (e) {
                      // eslint-disable-next-line no-alert
                      alert(e.message || 'Failed to reset password')
                    }
                  }}
                  className="rounded-full border border-slate-700/70 px-3 py-1 text-slate-300 hover:border-emerald-400/70"
                >
                  Reset Password
                </button>
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <p className="text-sm text-slate-400">No users.</p>
          )}
        </div>
      </div>
    </section>
  )
}

export default AdminUsers
