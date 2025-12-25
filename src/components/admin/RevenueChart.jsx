import React from 'react'

// lineData: [{ label: string, value: number }]
// pieData: [{ label: string, value: number, color?: string }]
export default function RevenueChart({ lineData = [], pieData = [] }) {
  const width = 520
  const height = 180
  const paddingX = 32
  const paddingY = 20
  const innerW = width - paddingX * 2
  const innerH = height - paddingY * 2
  const maxVal = lineData.reduce((m, d) => (d.value > m ? d.value : m), 0) || 1
  const minVal = 0
  const n = lineData.length || 1
  const xFor = (i) => paddingX + (n === 1 ? innerW / 2 : (innerW * i) / (n - 1))
  const yFor = (v) => paddingY + innerH - ((v - minVal) / (maxVal - minVal || 1)) * innerH
  const points = lineData.map((d, i) => `${xFor(i)},${yFor(d.value)}`).join(' ')

  const totalPie = pieData.reduce((s, p) => s + (p.value || 0), 0) || 1
  const cx = 70
  const cy = height / 2
  const r = 40

  let currentAngle = -Math.PI / 2
  const pieSegments = pieData.map((slice) => {
    const angle = (slice.value / totalPie) * Math.PI * 2
    const x1 = cx + r * Math.cos(currentAngle)
    const y1 = cy + r * Math.sin(currentAngle)
    const x2 = cx + r * Math.cos(currentAngle + angle)
    const y2 = cy + r * Math.sin(currentAngle + angle)
    const largeArc = angle > Math.PI ? 1 : 0
    const d = `M ${cx},${cy} L ${x1},${y1} A ${r},${r} 0 ${largeArc} 1 ${x2},${y2} Z`
    currentAngle += angle
    return { d, slice }
  })

  const palette = ['#22c55e', '#0ea5e9', '#eab308', '#f97316', '#a855f7']

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Revenue over time
        </p>
        <div className="mt-2">
          {lineData.length === 0 ? (
            <p className="text-[11px] text-slate-500">No revenue data for this range yet.</p>
          ) : (
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full max-w-full"
            >
              <defs>
                <linearGradient id="revLine" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
                <linearGradient id="revFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgba(34,197,94,0.35)" />
                  <stop offset="100%" stopColor="rgba(15,23,42,0)" />
                </linearGradient>
              </defs>
              {lineData.length > 0 && (
                <path
                  d={`M ${xFor(0)},${yFor(0)} L ${points} L ${xFor(
                    lineData.length - 1,
                  )},${yFor(0)} Z`}
                  fill="url(#revFill)"
                  stroke="none"
                />
              )}
              {lineData.length > 0 && (
                <polyline
                  fill="none"
                  stroke="url(#revLine)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={points}
                />
              )}
              {lineData.map((d, i) => (
                <circle
                  key={d.label + i}
                  cx={xFor(i)}
                  cy={yFor(d.value)}
                  r="2"
                  fill="#22c55e"
                />
              ))}
              {lineData.map((d, i) => {
                const show =
                  i === 0 ||
                  i === lineData.length - 1 ||
                  (lineData.length > 4 && i % Math.ceil(lineData.length / 4) === 0)
                if (!show) return null
                return (
                  <text
                    key={d.label + '-x' + i}
                    x={xFor(i)}
                    y={height - 4}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#64748b"
                  >
                    {d.label}
                  </text>
                )
              })}
            </svg>
          )}
        </div>
      </div>
      <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Revenue by source
        </p>
        <div className="mt-2 flex items-center gap-3">
          <svg viewBox={`0 0 ${cx * 2} ${height}`} className="h-32 w-32">
            {pieSegments.map(({ d, slice }, idx) => (
              <path
                key={slice.label + idx}
                d={d}
                fill={slice.color || palette[idx % palette.length]}
                opacity={0.95}
              />
            ))}
          </svg>
          <div className="flex-1 space-y-1 text-[11px]">
            {pieData.length === 0 ? (
              <p className="text-slate-500">No breakdown yet.</p>
            ) : (
              pieData.map((slice, idx) => {
                const pct = ((slice.value / totalPie) * 100).toFixed(1)
                return (
                  <div
                    key={slice.label + idx}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: slice.color || palette[idx % palette.length] }}
                      />
                      <span className="text-slate-200">{slice.label}</span>
                    </div>
                    <span className="tabular-nums text-slate-300">{pct}%</span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
