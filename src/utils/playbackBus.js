// Simple global playback bus to enforce exclusive audio playback.
// Holds a reference to the currently-playing controller (either WaveSurfer or HTMLAudioElement)
// and pauses it when another player starts.

let current = null

// Ensure the given controller becomes the exclusive player.
// The controller must implement a .pause() method (WaveSurfer or HTMLAudioElement).
export function ensureExclusive(controller) {
  try {
    if (current && current !== controller) {
      // Pause the previously active controller.
      if (typeof current.pause === 'function') current.pause()
    }
  } catch {}
  current = controller || null
}

// Clear the current controller reference if it matches the provided one.
export function clearIfCurrent(controller) {
  if (current === controller) {
    current = null
  }
}

// Stop whatever is current (if any) and clear.
export function stopAll() {
  try {
    if (current && typeof current.pause === 'function') current.pause()
  } catch {}
  current = null
}
