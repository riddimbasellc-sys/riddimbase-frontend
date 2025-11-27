import { useEffect, useRef } from 'react'
import { updateAgentStatus } from '../services/supportAgentService'
import { isBusinessDay } from '../constants/agentSchedule'

function getEasternHM(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: false })
  const [h, m] = fmt.format(date).split(':').map(x => parseInt(x, 10))
  return { hour: h, minute: m }
}

// Boundaries we watch for exact minute matches.
const boundaries = [
  { hour: 12, minute: 30, next: (status) => status === 'present' ? 'lunch' : null },
  { hour: 13, minute: 30, next: (status) => status === 'lunch' ? 'present' : null },
  { hour: 17, minute: 0, next: (status) => status !== 'eod' ? 'eod' : null }
]

export default function useAutoAgentStatus(agent, enabled) {
  const lastStatusRef = useRef(agent?.status)
  useEffect(() => { lastStatusRef.current = agent?.status }, [agent?.status])

  useEffect(() => {
    if (!enabled) return
    let timer = null
    async function tick() {
      if (!agent) return
      if (!isBusinessDay()) return
      const { hour, minute } = getEasternHM()
      for (const b of boundaries) {
        if (b.hour === hour && b.minute === minute) {
          const current = lastStatusRef.current
          const next = b.next(current)
          if (next) {
            try { await updateAgentStatus(agent.id, next); lastStatusRef.current = next } catch {}
          }
        }
      }
    }
    // Run immediately then every 60s
    tick()
    timer = setInterval(tick, 60000)
    return () => { if (timer) clearInterval(timer) }
  }, [agent, enabled])
}
