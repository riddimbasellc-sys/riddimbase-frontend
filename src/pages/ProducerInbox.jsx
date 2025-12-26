import ProducerLayout from '../components/ProducerLayout'
import { ProducerInbox as ProducerInboxView } from '../components/producerInbox/ProducerInbox.jsx'

export function ProducerInbox() {
  return (
    <ProducerLayout title="Inbox" subtitle="Direct messages & admin chats">
      <ProducerInboxView />
    </ProducerLayout>
  )
}

export default ProducerInbox
