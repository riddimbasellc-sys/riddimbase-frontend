import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const PAGE_SIZE = 40

export function useAdminRealtimeChat(currentUser) {
  const [conversations, setConversations] = useState([])
  const [activeConversationId, setActiveConversationId] = useState(null)
  const [messages, setMessages] = useState([])
  const [hasMore, setHasMore] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [typingUsers, setTypingUsers] = useState([])
  const channelRef = useRef(null)

  // Load conversations where this admin is a participant
  useEffect(() => {
    if (!currentUser) return
    ;(async () => {
      const { data, error } = await supabase
        .from('chat_participants')
        .select('conversation_id, role, chat_conversations(*)')
        .eq('user_id', currentUser.id)
        .eq('role', 'admin')
        .order('chat_conversations.last_message_at', { ascending: false })

      if (!error) {
        setConversations(
          (data || [])
            .map((row) => row.chat_conversations)
            .filter(Boolean),
        )
      }
    })()
  }, [currentUser])

  const loadMessages = useCallback(
    async ({ conversationId, before } = {}) => {
      const id = conversationId || activeConversationId
      if (!id || !currentUser || loadingMessages) return
      setLoadingMessages(true)

      let query = supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (before) {
        query = query.lt('created_at', before)
      }

      const { data, error } = await query
      setLoadingMessages(false)
      if (error) return

      const sorted = [...data].reverse()
      setMessages((prev) => (before ? [...sorted, ...prev] : sorted))
      setHasMore((data || []).length === PAGE_SIZE)
    },
    [activeConversationId, currentUser, loadingMessages],
  )

  useEffect(() => {
    if (!activeConversationId) return
    loadMessages({ conversationId: activeConversationId })
  }, [activeConversationId, loadMessages])

  // Realtime subscription for messages + presence (typing)
  useEffect(() => {
    if (!activeConversationId || !currentUser) return

    const channel = supabase
      .channel(`admin-chat:${activeConversationId}`, {
        config: {
          presence: { key: currentUser.id },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages((prev) => [...prev, payload.new])
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) =>
              prev.map((m) => (m.id === payload.new.id ? payload.new : m)),
            )
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) => prev.filter((m) => m.id !== payload.old.id))
          }
        },
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const others = Object.values(state)
          .flat()
          .filter((p) => p.user_id !== currentUser.id && p.typing)
        setTypingUsers(others)
      })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: currentUser.id,
          display_name: currentUser.user_metadata?.display_name || 'Admin',
          typing: false,
        })
      }
    })

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      channelRef.current = null
      setTypingUsers([])
    }
  }, [activeConversationId, currentUser])

  const setTyping = useCallback(
    (typing) => {
      const channel = channelRef.current
      if (!channel || !currentUser) return
      channel.track({
        user_id: currentUser.id,
        display_name: currentUser.user_metadata?.display_name || 'Admin',
        typing,
      })
    },
    [currentUser],
  )

  const sendMessage = useCallback(
    async ({ conversationId, type = 'text', content, attachment }) => {
      if (!currentUser) return
      const convId = conversationId || activeConversationId
      if (!convId) return

      const base = {
        conversation_id: convId,
        sender_id: currentUser.id,
        type,
        content,
      }

      const attachmentFields = attachment
        ? {
            attachment_url: attachment.publicUrl,
            attachment_name: attachment.name,
            attachment_mime: attachment.mime,
          }
        : {}

      const { error } = await supabase.from('chat_messages').insert({
        ...base,
        ...attachmentFields,
      })
      if (error) throw error
    },
    [activeConversationId, currentUser],
  )

  const deleteMessage = useCallback(async (messageId) => {
    await supabase.from('chat_messages').delete().eq('id', messageId)
  }, [])

  const blockUser = useCallback(
    async (userId) => {
      if (!currentUser) return
      await supabase.from('chat_blocks').insert({
        blocker_id: currentUser.id,
        blocked_id: userId,
      })
    },
    [currentUser],
  )

  const reportUser = useCallback(
    async ({ reportedUserId, conversationId, messageId, reason }) => {
      if (!currentUser) return
      await supabase.from('chat_reports').insert({
        reporter_id: currentUser.id,
        reported_user_id: reportedUserId,
        conversation_id: conversationId,
        message_id: messageId,
        reason,
      })
    },
    [currentUser],
  )

  return {
    conversations,
    activeConversationId,
    setActiveConversationId,
    messages,
    hasMore,
    loadMore: () => {
      if (!messages.length) return
      const oldest = messages[0]
      loadMessages({ before: oldest.created_at })
    },
    typingUsers,
    setTyping,
    sendMessage,
    deleteMessage,
    blockUser,
    reportUser,
  }
}
