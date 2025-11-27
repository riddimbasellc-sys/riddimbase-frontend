// Agent schedule constants and helpers
// Times are America/New_York (EST/EDT automatically handled by IANA zone)
export const BUSINESS_START = { hour: 8, minute: 0 }
export const LUNCH_START = { hour: 12, minute: 30 }
export const LUNCH_END = { hour: 13, minute: 30 }
export const BUSINESS_END = { hour: 17, minute: 0 }

function getEasternDateParts(date = new Date()) {
  const opts = { timeZone: 'America/New_York', hour12: false }
  const parts = new Intl.DateTimeFormat('en-US', { ...opts, hour: '2-digit', minute: '2-digit' }).format(date).split(':')
  return { hour: parseInt(parts[0], 10), minute: parseInt(parts[1], 10) }
}

function compareHM(a, b) {
  if (a.hour === b.hour) return a.minute - b.minute
  return a.hour - b.hour
}

export function isWithinBusinessHours(date = new Date()) {
  const hm = getEasternDateParts(date)
  return compareHM(hm, BUSINESS_START) >= 0 && compareHM(hm, BUSINESS_END) < 0
}

export function isLunchBreak(date = new Date()) {
  const hm = getEasternDateParts(date)
  return compareHM(hm, LUNCH_START) >= 0 && compareHM(hm, LUNCH_END) < 0
}

export function isBusinessDay(date = new Date()) {
  // Monday=1 ... Friday=5 using getUTCDay adjusted via timezone to Eastern
  // Simpler: use local of Eastern by formatting weekday
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short' }).format(date)
  return ['Mon','Tue','Wed','Thu','Fri'].includes(wd)
}

export function isAgentAvailable(agent, date = new Date()) {
  if (!agent) return false
  if (!isBusinessDay(date)) return false
  if (!isWithinBusinessHours(date)) return false
  if (isLunchBreak(date)) return false
  return agent.status === 'present'
}

export function nextStatusAvailability(status, date = new Date()) {
  // Returns message or null if status can be set now
  if (status === 'present') {
    if (!isWithinBusinessHours(date)) return 'Outside business hours'
    if (isLunchBreak(date)) return 'Currently lunch break'
  }
  if (status === 'lunch') {
    if (!isLunchBreak(date)) return 'Lunch can only be set 12:30-1:30 ET'
  }
  if (status === 'eod') {
    if (isWithinBusinessHours(date) && !isLunchBreak(date)) return 'EOD only after 5:00pm ET'
  }
  return null
}
