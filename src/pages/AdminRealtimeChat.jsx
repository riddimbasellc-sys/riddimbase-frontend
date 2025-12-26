import AdminLayout from '../components/AdminLayout'
import useSupabaseUser from '../hooks/useSupabaseUser'
import { useAdminRealtimeChat } from '../hooks/useAdminRealtimeChat'
import { AdminChatSidebar } from '../components/chat/AdminChatSidebar'
import { AdminChatThread } from '../components/chat/AdminChatThread'
import { AdminChatRightPanel } from '../components/chat/AdminChatRightPanel'

export function AdminRealtimeChat() {
  const { user } = useSupabaseUser()
  const chat = useAdminRealtimeChat(user)

  return (
    <AdminLayout
      title="Admin Chat (Realtime)"
      subtitle="Dark, music-inspired real-time inbox for RiddimBase."
    >
      <div className="h-[calc(100vh-140px)] rounded-3xl border border-slate-800/80 bg-slate-950/90 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.9)] flex overflow-hidden">
        <AdminChatSidebar
          conversations={chat.conversations}
          activeConversationId={chat.activeConversationId}
          onSelectConversation={chat.setActiveConversationId}
          onStartConversationWithUser={chat.startConversationWithUser}
        />
        <AdminChatThread
          activeConversationId={chat.activeConversationId}
          messages={chat.messages}
          hasMore={chat.hasMore}
          loadMore={chat.loadMore}
          sendMessage={chat.sendMessage}
          typingUsers={chat.typingUsers}
          setTyping={chat.setTyping}
        />
        <AdminChatRightPanel activeConversationId={chat.activeConversationId} />
      </div>
    </AdminLayout>
  )
}

export default AdminRealtimeChat
