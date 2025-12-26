import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const PAGE_SIZE = 40

// TODO: Align these table/column names with your actual Supabase schema

export function useProducerChat(currentUser) {
  const [conversations, setConversations] = useState([])
  const [conversationsLoading, setConversationsLoading] = useState(false)
  const [activeConversationId, setActiveConversationId] = useState(null)
  const [messages, setMessages] = useState([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [typingUsers, setTypingUsers] = useState([])

  // Load conversations for the current producer
  const refreshConversations = useCallback(async () => {
    if (!currentUser) return
    setConversationsLoading(true)
    const { data, error } = await supabase
      .from('chat_participants')
      .select(
        'conversation_id, role, chat_conversations(id, last_message_at, last_message_preview, other_user_id, other_user_name, other_user_avatar_url, unread_count)',
      )
      .eq('user_id', currentUser.id)
      .order('chat_conversations.last_message_at', { ascending: false })

    if (!error && data) {
      const mapped = data
        .map((row) => row.chat_conversations)
        .filter(Boolean)
        .map((c) => ({
          id: c.id,
          otherUserId: c.other_user_id,
          otherUserName: c.other_user_name,
          otherUserAvatarUrl: c.other_user_avatar_url,
          lastMessagePreview: c.last_message_preview,
          lastMessageAt: c.last_message_at,
          unreadCount: c.unread_count,
        }))

      setConversations(mapped)
      if (!activeConversationId && mapped.length > 0) {
        setActiveConversationId(mapped[0].id)
      }
    }

    setConversationsLoading(false)
  }, [currentUser, activeConversationId])

  useEffect(() => {
    if (!currentUser) return
    refreshConversations()
  }, [currentUser, refreshConversations])

  const activeConversation = useMemo(() => {
    const found = conversations.find((c) => c.id === activeConversationId)
    if (!found) return null
    return {
      id: found.id,
      otherUserId: found.otherUserId,
      otherUserName: found.otherUserName,
      otherUserAvatarUrl: found.otherUserAvatarUrl,
      isOnline: false,
    }
  }, [activeConversationId, conversations])

  const loadMessages = useCallback(
    async ({ conversationId, before } = {}) => {
      const id = conversationId || activeConversationId
      if (!id || !currentUser || messagesLoading) return
      setMessagesLoading(true)

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
      setMessagesLoading(false)
      if (error || !data) return

      const sorted = [...data].reverse()
      setMessages((prev) => (before ? [...sorted, ...prev] : sorted))
      setHasMore(data.length === PAGE_SIZE)
    },
    [activeConversationId, currentUser, messagesLoading],
  )

  useEffect(() => {
    if (!activeConversationId) return
    loadMessages({ conversationId: activeConversationId })
  }, [activeConversationId, loadMessages])

  // TODO: Add realtime subscription + presence for typing indicators

  const sendMessage = useCallback(
    async ({ conversationId, text, attachment }) => {
      if (!currentUser || !conversationId) return
      let type = 'text'
      let attachmentFields = {}

      if (attachment) {
        // TODO: Upload file via your existing upload service and set attachment_url
        type = attachment.type
        attachmentFields = {
          type,
          // attachment_url: uploadedUrl,
          attachment_name: attachment.file.name,
        }
      }

      const payload = {
        conversation_id: conversationId,
        sender_id: currentUser.id,
        type,
        content: text || null,
        ...attachmentFields,
      }

      const { error } = await supabase.from('chat_messages').insert(payload)
      if (error) {
        console.error('sendMessage error', error)
        return
      }

      // Keep conversation list metadata in sync
      const now = new Date().toISOString()
      let preview = text || ''
      if (!preview && attachment) {
        if (type === 'image') preview = '[Image]'
        else if (type === 'audio') preview = '[Audio]'
        else preview = '[File]'
      }

      await supabase
        .from('chat_conversations')
        .update({
          last_message_at: now,
          last_message_preview: preview,
        })
        .eq('id', conversationId)
    },
    [currentUser],
  )

  const clearChat = useCallback(async (conversationId) => {
    await supabase.from('chat_messages').delete().eq('conversation_id', conversationId)
    setMessages([])
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

  // When producer selects a user from search, open existing conversation or create a new one
  const startConversationWithUser = useCallback(
    async (user) => {
      if (!currentUser || !user?.id) return

      const [{ data: myRows }, { data: theirRows }] = await Promise.all([
        supabase
          .from('chat_participants')
          .select('conversation_id')
          .eq('user_id', currentUser.id),
        supabase
          .from('chat_participants')
          .select('conversation_id')
          .eq('user_id', user.id),
      ])

      const mine = new Set((myRows || []).map((r) => r.conversation_id))
      const shared = (theirRows || []).find((r) => mine.has(r.conversation_id))

      let conversationId = shared?.conversation_id || null
      let createdConversation = null

      if (!conversationId) {
        const { data: created, error: convError } = await supabase
          .from('chat_conversations')
          .insert({
            subject: user.display_name || user.username || user.email || 'Conversation',
          })
          .select('*')
          .single()

        if (convError || !created) return

        conversationId = created.id
        createdConversation = created

        await supabase.from('chat_participants').insert([
          { conversation_id: conversationId, user_id: currentUser.id, role: 'producer' },
          { conversation_id: conversationId, user_id: user.id, role: 'member' },
        ])
      }

      if (conversationId && createdConversation) {
        setConversations((prev) => {
          if (prev.some((c) => c.id === conversationId)) return prev
          return [
            {
              id: conversationId,
              otherUserId: user.id,
              otherUserName:
                user.display_name || user.username || user.email || 'Conversation',
              otherUserAvatarUrl: user.avatar_url || null,
              lastMessagePreview: null,
              lastMessageAt: null,
              unreadCount: 0,
            },
            ...prev,
          ]
        })
      } else if (conversationId && !createdConversation) {
        // Ensure list reflects an existing conversation we just reused
        refreshConversations()
      }

      if (conversationId) {
        setActiveConversationId(conversationId)
      }
    },
    [currentUser, refreshConversations],
  )

  const reportUser = useCallback(
    async ({ reportedUserId, conversationId, reason, note }) => {
      if (!currentUser) return
      await supabase.from('chat_reports').insert({
        reporter_id: currentUser.id,
        reported_user_id: reportedUserId,
        conversation_id: conversationId,
        reason,
        note,
      })
    },
    [currentUser],
  )

  return {
    conversations,
    conversationsLoading,
    activeConversationId,
    setActiveConversationId,
    activeConversation,
    messages,
    messagesLoading,
    hasMore,
    loadMore: () => {
      if (!messages.length) return
      const oldest = messages[0]
      loadMessages({ before: oldest.created_at })
    },
    typingUsers,
    sendMessage,
    clearChat,
    blockUser,
    reportUser,
    startConversationWithUser,
  }
}
