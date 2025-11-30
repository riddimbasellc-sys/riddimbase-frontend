import React from 'react'

export function NavEditor({ links, onChange }) {
  const handleUpdate = (index, patch) => {
    const next = links.map((l, i) => (i === index ? { ...l, ...patch } : l))
    onChange(next)
  }

  const handleAdd = () => {
    const next = [
      ...links,
      {
        id: `link-${Date.now()}`,
        label: 'New link',
        href: '/',
        visible: true,
        external: false,
      },
    ]
    onChange(next)
  }

  const handleRemove = (index) => {
    const next = links.filter((_, i) => i !== index)
    onChange(next)
  }

  const move = (index, dir) => {
    const next = [...links]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    const temp = next[index]
    next[index] = next[target]
    next[target] = temp
    onChange(next)
  }

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-rb-gloss-panel">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">
            Navigation
          </h3>
          <p className="mt-1 text-[11px] text-slate-400">
            Control the top-level links in your navbar.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-full bg-red-500 px-3 py-1.5 text-[11px] font-semibold text-slate-50 hover:bg-red-400"
        >
          Add link
        </button>
      </div>

      <div className="mt-4 space-y-3 text-[11px]">
        {links.map((link, index) => (
          <div
            key={link.id || index}
            className="rounded-xl border border-slate-800/80 bg-slate-950/80 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <input
                className="w-32 rounded-md border border-slate-700/80 bg-slate-900/80 px-2 py-1 text-[11px] text-slate-100 focus:border-red-400 focus:outline-none"
                value={link.label}
                onChange={(e) => handleUpdate(index, { label: e.target.value })}
                placeholder="Label"
              />
              <input
                className="flex-1 rounded-md border border-slate-700/80 bg-slate-900/80 px-2 py-1 text-[11px] text-slate-100 focus:border-red-400 focus:outline-none"
                value={link.href}
                onChange={(e) => handleUpdate(index, { href: e.target.value })}
                placeholder="/path"
              />
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-1 text-[10px] text-slate-300">
                  <input
                    type="checkbox"
                    className="h-3 w-3 rounded border-slate-600 bg-slate-900"
                    checked={link.visible !== false}
                    onChange={(e) =>
                      handleUpdate(index, { visible: e.target.checked })
                    }
                  />
                  <span>Visible</span>
                </label>
                <label className="inline-flex items-center gap-1 text-[10px] text-slate-300">
                  <input
                    type="checkbox"
                    className="h-3 w-3 rounded border-slate-600 bg-slate-900"
                    checked={!!link.external}
                    onChange={(e) =>
                      handleUpdate(index, { external: e.target.checked })
                    }
                  />
                  <span>External</span>
                </label>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  className="rounded-full border border-slate-700/80 px-2 py-1 text-[10px] text-slate-300 hover:border-slate-500"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  className="rounded-full border border-slate-700/80 px-2 py-1 text-[10px] text-slate-300 hover:border-slate-500"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="rounded-full border border-red-500/70 px-2 py-1 text-[10px] text-red-300 hover:bg-red-500/10"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
        {links.length === 0 && (
          <p className="text-[11px] text-slate-500">
            No navigation links yet. Add at least Home and Beats for a good
            starting point.
          </p>
        )}
      </div>
    </div>
  )
}

