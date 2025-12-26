import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import type { ConversationListItem } from './ConversationList'
import type { ConversationSummary } from './ChatWindow'
import type { Message } from './MessageBubble'
import type { OutgoingMessagePayload } from './MessageInput'

const PAGE_SIZE = 40

// TODO: Align these table/column names with your actual Supabase schema

export function useProducerChat(currentUser: any) {
  const [conversations, setConversations] = useState<ConversationListItem[]>([])
  const [conversationsLoading, setConversationsLoading] = useState(false)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    null,
  )
  const [messages, setMessages] = useState<Message[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [typingUsers, setTypingUsers] = useState<{ display_name?: string }[]>(
    [],
  )

  // Load conversations for the current producer
  useEffect(() => {
    if (!currentUser) return
    setConversationsLoading(true)
    ;(async () => {
      // Example: join chat_participants + chat_conversations
      const { data, error } = await supabase
        .from('chat_participants')
        .select(
          'conversation_id, role, chat_conversations(id, last_message_at, last_message_preview, other_user_id, other_user_name, other_user_avatar_url, unread_count)',
        )
        .eq('user_id', currentUser.id)
        .order('chat_conversations.last_message_at', { ascending: false })

      if (!error && data) {
        const mapped: ConversationListItem[] = data
          .map((row: any) => row.chat_conversations)
          .filter(Boolean)
          .map((c: any) => ({
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
    })()
  }, [currentUser])

  const activeConversation: ConversationSummary | null = useMemo(() => {
    const found = conversations.find((c) => c.id === activeConversationId)
    if (!found) return null
    return {
      id: found.id,
      otherUserId: found.otherUserId,
      otherUserName: found.otherUserName,
      otherUserAvatarUrl: found.otherUserAvatarUrl,
      isOnline: false, // TODO: wire presence/online status if desired
    }
  }, [activeConversationId, conversations])

  const loadMessages = useCallback(
    async ({ conversationId, before }: { conversationId?: string; before?: string } = {}) => {
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

      const sorted = [...data].reverse() as Message[]
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
    async ({ conversationId, text, attachment }: OutgoingMessagePayload & { conversationId: string | null }) => {
      if (!currentUser || !conversationId) return
      let type: Message['type'] = 'text'
      let attachmentFields: Partial<Message> = {}

      if (attachment) {
        // TODO: Upload file via your existing upload service and set attachment_url
        type = attachment.type
        attachmentFields = {
          type,
          // attachment_url: uploadedUrl,
          attachment_name: attachment.file.name,
        } as any
      }

      const payload: Partial<Message> & { conversation_id: string; sender_id: string } = {
        conversation_id: conversationId,
        sender_id: currentUser.id,
        type,
        content: text || null,
        ...(attachmentFields as any),
      }

      const { error } = await supabase.from('chat_messages').insert(payload)
      if (error) {
        // eslint-disable-next-line no-console
        console.error('sendMessage error', error)
      }
    },
    [currentUser],
  )

  const clearChat = useCallback(
    async (conversationId: string) => {
      // TODO: Confirm before clearing, maybe only soft-delete
      await supabase.from('chat_messages').delete().eq('conversation_id', conversationId)
      setMessages([])
    },
    [],
  )

  const blockUser = useCallback(
    async (userId: string) => {
      if (!currentUser) return
      // TODO: Implement chat_blocks table and insert blocker/blocked pair
      await supabase.from('chat_blocks').insert({
        blocker_id: currentUser.id,
        blocked_id: userId,
      })
    },
    [currentUser],
  )

  const reportUser = useCallback(
    async ({
      reportedUserId,
      conversationId,
      reason,
      note,
    }: {
      reportedUserId: string
      conversationId: string
      reason: string
      note?: string
    }) => {
      if (!currentUser) return
      // TODO: Implement chat_reports table with moderation workflow
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
  }
}
