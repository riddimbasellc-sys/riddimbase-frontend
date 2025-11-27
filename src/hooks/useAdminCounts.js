import { useEffect, useState, useCallback } from 'react'
import { listReports } from '../services/reportService'
import { listSupportTickets } from '../services/supportTicketService'
import { listAllPayouts } from '../services/payoutsRepository'
import { supabase } from '../lib/supabaseClient'

// Hook: aggregates admin notification counts (open reports, open tickets, pending payouts)
export default function useAdminCounts() {
  const [reportsOpen, setReportsOpen] = useState(0)
  const [ticketsOpen, setTicketsOpen] = useState(0)
  const [payoutsPending, setPayoutsPending] = useState(0)
  const [jobsPending, setJobsPending] = useState(0)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      try {
        const reports = await listReports()
        setReportsOpen(reports.filter(r => r.status === 'open').length)
      } catch {}
      try {
        const tickets = listSupportTickets() || []
        setTicketsOpen(tickets.filter(t => t.status === 'open').length)
      } catch {}
      try {
        const payouts = await listAllPayouts()
        setPayoutsPending(payouts.filter(p => p.status === 'pending').length)
      } catch {}
      try {
        const { data, error } = await supabase
          .from('job_requests')
          .select('id, status')
          .eq('status', 'pending')
        if (!error) {
          setJobsPending((data || []).length)
        }
      } catch {}
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  useEffect(() => {
    const channel = supabase.channel('admin-counts-reports')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, refresh)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'reports' }, refresh)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [refresh])

  return { reportsOpen, ticketsOpen, payoutsPending, jobsPending, loading, refresh }
}
