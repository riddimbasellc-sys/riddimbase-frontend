import { useEffect, useState } from 'react'
import { unreadCount } from '../services/socialService'
import { supabase } from '../lib/supabaseClient'

export default function useUnreadMessages(userId) {
  const [unread, setUnread] = useState(0)
  const refresh = async () => { setUnread(await unreadCount(userId)) }
  useEffect(() => { if (userId) refresh() }, [userId])
  useEffect(() => {
    if (!userId) return
    const channel = supabase.channel('messages-unread-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        if (payload.new.recipient_id === userId) refresh()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, payload => {
        if (payload.new.recipient_id === userId) refresh()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])
  return { unread, refresh }
}
