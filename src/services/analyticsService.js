// Local analytics prototype (will migrate to Supabase events later)

const playKey = (beatId) => `plays:${beatId}`

export function recordPlay(beatId) {
  if (!beatId) return
  const current = parseInt(localStorage.getItem(playKey(beatId))||'0',10)
  localStorage.setItem(playKey(beatId), String(current + 1))
}

export function getPlayCount(beatId) {
  if (!beatId) return 0
  return parseInt(localStorage.getItem(playKey(beatId))||'0',10)
}

export function getTotalPlaysForBeats(beatIds=[]) {
  return beatIds.reduce((sum,id)=> sum + getPlayCount(id),0)
}

export function getAveragePlaysPerBeat(beatIds=[]) {
  if (!beatIds.length) return 0
  return getTotalPlaysForBeats(beatIds) / beatIds.length
}

export function topBeatsByPlays(beatIds=[], limit=3) {
  return beatIds
    .map(id => ({ id, plays: getPlayCount(id) }))
    .sort((a,b)=> b.plays - a.plays)
    .slice(0, limit)
}
