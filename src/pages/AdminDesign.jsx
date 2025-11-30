import { useAdminRole } from '../hooks/useAdminRole'
import { DesignPanel as InnerDesignPanel } from '../admin/DesignPanel'

export default function AdminDesign() {
  const { isAdmin, loading } = useAdminRole()

  if (loading) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-slate-950/95">
        <p className="text-sm text-slate-400">Loading admin access...</p>
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

  return <InnerDesignPanel />
}
