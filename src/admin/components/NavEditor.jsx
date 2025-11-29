import React from 'react'

const EMPTY_LINK = {
  id: '',
  label: '',
  href: '/',
  visible: true,
  external: false,
}

export function NavEditor({ links, onChange }) {
  const handleChange = (index, patch) => {
    const next = links.map((link, i) =>
      i === index ? { ...link, ...patch } : link,
    )
    onChange(next)
  }

  const handleAdd = () => {
    const newLink = {
      ...EMPTY_LINK,
      id: `link_${Date.now()}`,
      label: 'New link',
    }
    onChange([...(links || []), newLink])
  }

  const handleRemove = (index) => {
    const next = links.filter((_, i) => i !== index)
    onChange(next)
  }

  const move = (index, delta) => {
    const nextIndex = index + delta
    if (nextIndex < 0 || nextIndex >= links.length) return
    const next = [...links]
    const [item] = next.splice(index, 1)
    next.splice(nextIndex, 0, item)
    onChange(next)
  }

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-rb-gloss-panel">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Navigation</h3>
          <p className="mt-1 text-[11px] text-slate-400">
            Configure the main navigation shown in the header.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-900 shadow hover:bg-slate-100"
        >
          + Add link
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {links.length === 0 && (
          <p className="text-[11px] text-slate-500">
            No navigation links yet. Add at least one to get started.
          </p>
        )}
        {links.map((link, index) => (
          <div
            key={link.id || index}
            className="rounded-xl border border-slate-800/80 bg-slate-950/80 p-3 text-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-1 items-center gap-2">
                <input
                  type="text"
                  value={link.label}
                  onChange={(e) => handleChange(index, { label: e.target.value })}
                  placeholder="Label"
                  className="w-32 rounded-lg border border-slate-700/80 bg-slate-900/80 px-2 py-1 text-[11px] text-slate-100 placeholder:text-slate-500 focus:border-red-400 focus:outline-none"
                />
                <input
                  type="text"
                  value={link.href}
                  onChange={(e) => handleChange(index, { href: e.target.value })}
                  placeholder="/beats"
                  className="flex-1 rounded-lg border border-slate-700/80 bg-slate-900/80 px-2 py-1 text-[11px] text-slate-100 placeholder:text-slate-500 focus:border-red-400 focus:outline-none"
                />
                <label className="inline-flex items-center gap-1 text-[10px] text-slate-300">
                  <input
                    type="checkbox"
                    checked={link.visible !== false}
                    onChange={(e) => handleChange(index, { visible: e.target.checked })}
                    className="h-3 w-3 rounded border-slate-600 bg-slate-900"
                  />
                  <span>Visible</span>
                </label>
                <label className="inline-flex items-center gap-1 text-[10px] text-slate-300">
                  <input
                    type="checkbox"
                    checked={!!link.external}
                    onChange={(e) => handleChange(index, { external: e.target.checked })}
                    className="h-3 w-3 rounded border-slate-600 bg-slate-900"
                  />
                  <span>External</span>
                </label>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  className="rounded-full border border-slate-700/80 bg-slate-900/80 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-800"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  className="rounded-full border border-slate-700/80 bg-slate-900/80 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-800"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="rounded-full border border-red-500/70 bg-red-500/10 px-2 py-1 text-[10px] text-red-300 hover:bg-red-500/20"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default NavEditor

