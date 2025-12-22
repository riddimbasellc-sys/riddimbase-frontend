import { useEffect, useRef } from 'react'

export default function WaveformCanvas({ analyser, isActive, theme = 'studio' }) {
  const canvasRef = useRef(null)
  const frameRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let dataArray
    let bufferLength

    if (analyser) {
      bufferLength = analyser.frequencyBinCount
      dataArray = new Uint8Array(bufferLength)
    }

    const drawIdle = () => {
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)
      const mid = h / 2
      ctx.strokeStyle = 'rgba(148,163,184,0.5)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, mid)
      for (let x = 0; x <= w; x += 8) {
        const amp = Math.sin((x / w) * Math.PI * 2) * 4
        ctx.lineTo(x, mid + amp)
      }
      ctx.stroke()
    }

    const render = () => {
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)

      if (analyser && isActive) {
        analyser.getByteTimeDomainData(dataArray)
        ctx.lineWidth = 2
        const gradient = ctx.createLinearGradient(0, 0, w, 0)
        gradient.addColorStop(0, '#f97373')
        gradient.addColorStop(0.5, '#fb7185')
        gradient.addColorStop(1, '#facc15')
        ctx.strokeStyle = gradient
        ctx.beginPath()

        const sliceWidth = (w * 1.0) / bufferLength
        let x = 0
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0
          const y = (v * h) / 2
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
          x += sliceWidth
        }
        ctx.lineTo(w, h / 2)
        ctx.stroke()
      } else {
        drawIdle()
      }

      frameRef.current = requestAnimationFrame(render)
    }

    frameRef.current = requestAnimationFrame(render)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [analyser, isActive])

  return (
    <div className={`studio-waveform-bg rounded-2xl border border-slate-800/80 p-3 ${theme === 'studio' ? 'shadow-[0_0_30px_rgba(15,23,42,0.9)]' : ''}`}>
      <canvas
        ref={canvasRef}
        className="studio-waveform-canvas"
        width={800}
        height={220}
      />
    </div>
  )
}
