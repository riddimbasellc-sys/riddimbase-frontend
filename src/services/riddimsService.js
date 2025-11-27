let riddims = [
  { id: 'r1', name: 'Summer Bashment', genre: 'Dancehall', bpm: 100, slotsTotal: 6, slotsFilled: 4, pricePerSlot: 25 },
  { id: 'r2', name: 'Carnival Charge', genre: 'Soca', bpm: 118, slotsTotal: 8, slotsFilled: 3, pricePerSlot: 30 },
  { id: 'r3', name: 'Roots Revival', genre: 'Reggae', bpm: 90, slotsTotal: 5, slotsFilled: 5, pricePerSlot: 20 },
]

export function listOpenRiddims() {
  return riddims.filter(r => r.slotsFilled < r.slotsTotal)
}

export function listAllRiddims() {
  return riddims
}

export function reserveSlot(riddimId) {
  const r = riddims.find(r => r.id === riddimId)
  if (!r) return null
  if (r.slotsFilled >= r.slotsTotal) return null
  r.slotsFilled += 1
  return r
}
