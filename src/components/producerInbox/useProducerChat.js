import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import {
  fetchThreads,
  fetchProfilesByIds,
  fetchMessages as fetchPairMessages,
  sendMessage as sendDirectMessage,
  markThreadRead,
} from '../../services/socialService'

const PAGE_SIZE = 50

// Producer Inbox hook backed by the existing messages table used by ChatWidget.
// Conversations are grouped by other user, using fetchThreads + fetchMessages.

export function useProducerChat(currentUser) {
  const [conversations, setConversations] = useState([])
  const [conversationsLoading, setConversationsLoading] = useState(false)
  const [activeConversationId, setActiveConversationId] = useState(null)
  const [messages, setMessages] = useState([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [typingUsers, setTypingUsers] = useState([])

  // Load conversations for the current producer from the existing messages table.
  const refreshConversations = useCallback(async () => {
    if (!currentUser) return
    setConversationsLoading(true)
    try {
      const threads = await fetchThreads({ userId: currentUser.id, limit: 40 })
      if (!threads || !threads.length) {
        setConversations([])
        return
      }

      const otherIds = threads.map((t) => t.otherUserId)
      const profiles = await fetchProfilesByIds(otherIds)
      const profileById = new Map((profiles || []).map((p) => [p.id, p]))

      // Fetch unread counts per other user (messages where they sent to the current user and read_at is null).
      const unreadBySender = {}
      if (otherIds.length) {
        const { data: unreadRows, error: unreadError } = await supabase
          .from('messages')
          .select('sender_id')
          .eq('recipient_id', currentUser.id)
          .is('read_at', null)
          .in('sender_id', otherIds)

        if (!unreadError && Array.isArray(unreadRows)) {
          unreadRows.forEach((row) => {
            const sid = row.sender_id
            if (!sid) return
            unreadBySender[sid] = (unreadBySender[sid] || 0) + 1
          })
        }
      }

      const mapped = threads.map(({ otherUserId, last }) => {
        const profile = profileById.get(otherUserId) || {}
        let displayName =
          profile.display_name || profile.username || profile.email || 'User'
        const avatarUrl = profile.avatar_url || null
        const hasAttachment = !!last.attachment_url
        const previewBase =
          last.content && last.content.trim().length > 0 ? last.content : ''
        const lastMessagePreview =
          previewBase || (hasAttachment ? '[Attachment]' : '') || ''

        // Ticket-originated DMs should appear as coming from Customer Support
        if (typeof last.content === 'string' && last.content.startsWith('[Ticket ')) {
          displayName = 'Customer Support'
        }

        return {
          id: otherUserId,
          otherUserId,
          otherUserName: displayName,
          otherUserAvatarUrl: avatarUrl,
          lastMessagePreview,
          lastMessageAt: last.created_at,
          unreadCount: unreadBySender[otherUserId] || 0,
        }
      })

      setConversations(mapped)
      if (!activeConversationId && mapped.length > 0) {
        setActiveConversationId(mapped[0].id)
      }
    } catch (e) {
      console.warn('[useProducerChat] refreshConversations failed', e)
      setConversations([])
    } finally {
      setConversationsLoading(false)
    }
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
    async ({ otherUserId } = {}) => {
      const targetId = otherUserId || activeConversationId
      if (!targetId || !currentUser || messagesLoading) return
      setMessagesLoading(true)
      try {
        const data = await fetchPairMessages({
          userId: currentUser.id,
          otherUserId: targetId,
          limit: PAGE_SIZE,
        })
        const mappedMessages = Array.isArray(data)
          ? data.map((m) => ({
              ...m,
              // Normalize attachment type for MessageBubble consumption
              type: m.attachment_type || (m.attachment_url ? 'file' : null),
            }))
          : []

        setMessages(mappedMessages)
        setHasMore(false)

        // Mark this thread as read now that it has been opened.
        try {
          await markThreadRead({ userId: currentUser.id, otherUserId: targetId })
          setConversations((prev) =>
            prev.map((c) =>
              c.otherUserId === targetId ? { ...c, unreadCount: 0 } : c,
            ),
          )
        } catch (e) {
          console.warn('[useProducerChat] markThreadRead failed', e)
        }
      } catch (e) {
        console.warn('[useProducerChat] loadMessages failed', e)
        setMessages([])
        setHasMore(false)
      } finally {
        setMessagesLoading(false)
      }
    },
    [activeConversationId, currentUser, messagesLoading],
  )

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([])
      return
    }
    loadMessages({ otherUserId: activeConversationId })
  }, [activeConversationId, loadMessages])

  // TODO: Add realtime subscription + presence for typing indicators

  const sendMessage = useCallback(
    async ({ conversationId, text, attachment }) => {
      const otherUserId = conversationId
      if (!currentUser || !otherUserId) return

      let attachmentUrl = null
      let attachmentType = null
      let attachmentName = null

      if (attachment && attachment.file) {
        try {
          // Defer to the same chat attachment upload path used by ChatWidget
          const { uploadChatAttachment } = await import('../../services/storageService')
          const { publicUrl } = await uploadChatAttachment(attachment.file)
          if (publicUrl) {
            attachmentUrl = publicUrl
            attachmentType = attachment.file.type || attachment.type || 'file'
            attachmentName = attachment.file.name
          }
        } catch (e) {
          console.warn('[useProducerChat] attachment upload failed', e)
        }
      }

      const res = await sendDirectMessage({
        senderId: currentUser.id,
        recipientId: otherUserId,
        content: text,
        attachmentUrl,
        attachmentType,
        attachmentName,
      })

      if (res?.limitReached) {
        // socialService already returns a friendly error message
        // eslint-disable-next-line no-alert
        alert(
          res.error ||
            'Free plan messaging limit reached. Upgrade your plan for unlimited messages.',
        )
        return
      }

      if (!res?.success || !res.message) return

      setMessages((prev) => [...prev, res.message])
      refreshConversations()
    },
    [currentUser, refreshConversations],
  )

  const clearChat = useCallback(
    async (otherUserId) => {
      if (!currentUser || !otherUserId) return
      try {
        await supabase
          .from('messages')
          .delete()
          .or(
            `and(sender_id.eq.${currentUser.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${currentUser.id})`,
          )
        setMessages([])
        refreshConversations()
      } catch (e) {
        console.warn('[useProducerChat] clearChat failed', e)
      }
    },
    [currentUser, refreshConversations],
  )

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

  // When producer selects a user from search, open (or create) a conversation based on messages.
  const startConversationWithUser = useCallback(
    async (user) => {
      if (!currentUser || !user?.id) return

      const otherUserId = user.id

      setConversations((prev) => {
        if (prev.some((c) => c.otherUserId === otherUserId)) return prev
        return [
          {
            id: otherUserId,
            otherUserId,
            otherUserName:
              user.display_name || user.username || user.email || 'User',
            otherUserAvatarUrl: user.avatar_url || null,
            lastMessagePreview: null,
            lastMessageAt: null,
            unreadCount: 0,
          },
          ...prev,
        ]
      })

      setActiveConversationId(otherUserId)
      loadMessages({ otherUserId })
    },
    [currentUser, loadMessages],
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
