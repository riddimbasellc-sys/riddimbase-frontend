import React, { useMemo, useState } from 'react'
import { ConversationList } from './ConversationList'
import { ChatWindow } from './ChatWindow'
import { MessageInput } from './MessageInput'
import { ReportUserModal } from './ReportUserModal'
import useSupabaseUser from '../../hooks/useSupabaseUser'
import { useProducerChat } from './useProducerChat'

export const ProducerInbox: React.FC = () => {
  const { user } = useSupabaseUser()
  const [reportOpen, setReportOpen] = useState(false)
  const [reportTarget, setReportTarget] = useState<{
    userId: string
    conversationId: string
  } | null>(null)

  const {
    conversations,
    conversationsLoading,
    activeConversationId,
    setActiveConversationId,
    activeConversation,
    messages,
    messagesLoading,
    hasMore,
    loadMore,
    typingUsers,
    sendMessage,
    clearChat,
    blockUser,
    reportUser,
  } = useProducerChat(user)

  const handleOpenReport = (targetUserId: string, conversationId: string) => {
    setReportTarget({ userId: targetUserId, conversationId })
    setReportOpen(true)
  }

  const handleSubmitReport = async (reason: string, note?: string) => {
    if (!reportTarget) return
    await reportUser({
      reportedUserId: reportTarget.userId,
      conversationId: reportTarget.conversationId,
      reason,
      note,
    })
    setReportOpen(false)
    setReportTarget(null)
  }

  const canChat = !!user

  return (
    <div className="flex h-full min-h-[480px] max-h-[calc(100vh-6rem)] rounded-3xl border border-slate-800/80 bg-slate-950/95 backdrop-blur-2xl shadow-[0_24px_80px_rgba(15,23,42,0.9)] overflow-hidden">
      <ConversationList
        conversations={conversations}
        loading={conversationsLoading}
        activeConversationId={activeConversationId}
        onSelectConversation={setActiveConversationId}
      />

      <div className="flex flex-1 flex-col border-l border-slate-900/70">
        <ChatWindow
          currentUserId={user?.id ?? ''}
          conversation={activeConversation}
          messages={messages}
          loading={messagesLoading}
          hasMore={hasMore}
          onLoadMore={loadMore}
          typingUsers={typingUsers}
          onBlockUser={blockUser}
          onClearChat={clearChat}
          onOpenReport={handleOpenReport}
        />

        <div className="border-t border-slate-900/70 bg-slate-950/90 px-3 py-3">
          <MessageInput
            disabled={!canChat || !activeConversation}
            onSend={(payload) =>
              sendMessage({ conversationId: activeConversationId, ...payload })
            }
          />
        </div>
      </div>

      <ReportUserModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onSubmit={handleSubmitReport}
      />
    </div>
  )
}

export default ProducerInbox
