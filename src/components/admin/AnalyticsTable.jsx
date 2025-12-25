import React from 'react'

// columns: [{ key, label, align?, className? }]
// rows: [{ key, ...data }]
export default function AnalyticsTable({ columns, rows, emptyLabel = 'No data yet' }) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/80">
      <div className="max-h-80 overflow-y-auto">
        <table className="min-w-full divide-y divide-slate-800 text-xs">
          <thead className="bg-slate-950/90">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`sticky top-0 z-10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 bg-slate-950/95 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.className || ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900/80">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-6 text-center text-[11px] text-slate-500"
                >
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.key} className="hover:bg-slate-900/60">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-3 py-2 align-middle text-[11px] text-slate-200/90 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.className || ''}`}
                    >
                      {row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
