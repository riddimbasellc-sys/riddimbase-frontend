import { useRef, useState, useEffect } from 'react'

export function FilePickerButton({ label, accept, onSelect, onCancel, progress=0, file=null, className='' }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const handleClick = () => inputRef.current?.click()
  const handleChange = (e) => {
    const f = e.target.files?.[0] || null
    onSelect(f)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!dragging) setDragging(true)
  }
  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
  }
  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
    const dtFile = e.dataTransfer.files?.[0]
    if (dtFile && accept) {
      // Basic accept filter by extension or mime substring
      const lowered = accept.toLowerCase()
      const nameOk = lowered.split(',').some(token => {
        token = token.trim()
        if (!token) return false
        if (token.startsWith('.')) return dtFile.name.toLowerCase().endsWith(token)
        return dtFile.type.toLowerCase().includes(token)
      })
      if (!nameOk) {
        console.warn('[FilePicker] Dropped file type not accepted')
      }
    }
    onSelect(dtFile || null)
  }

  const pct = Math.min(100, Math.max(0, progress))
  const uploading = pct > 0 && pct < 100
  const done = pct === 100

  return (
    <div className={`flex flex-col items-start gap-2 ${className}`}>
      <p className="text-xs font-semibold text-slate-300">{label}</p>
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`group relative flex cursor-pointer items-center justify-center rounded-xl border p-3 w-20 h-20 overflow-hidden shadow-inner transition ${dragging? 'border-emerald-400 bg-slate-900/80' : 'border-slate-700/70 bg-slate-900/70 hover:border-emerald-400/70'}`}
      >
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-slate-800/40 via-transparent to-slate-900/60" />
        {!file && !uploading && !done && (
          <div className="relative flex flex-col items-center text-emerald-400">
            <svg
              className="h-8 w-8 transition-transform duration-300 group-hover:scale-110 group-active:scale-95"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="mt-1 text-[10px] font-medium tracking-wide text-emerald-300 group-hover:text-emerald-200">
              {dragging ? 'Drop' : 'Add'}
            </span>
            <div className="absolute -inset-4 animate-pulse rounded-full bg-emerald-500/5" />
          </div>
        )}
        {(file || uploading || done) && (
          <div className="relative flex flex-col items-center justify-center h-full w-full">
            {uploading && (
              <div className="relative">
                <div
                  className="h-12 w-12 rounded-full"
                  style={{
                    background: `conic-gradient(#10b981 ${pct * 3.6}deg, rgba(16,185,129,0.15) 0deg)`
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] font-semibold text-emerald-300">{pct}%</span>
                </div>
              </div>
            )}
            {uploading && onCancel && (
              <button
                type="button"
                onClick={(e)=>{ e.stopPropagation(); onCancel() }}
                className="absolute top-1 right-1 rounded-full bg-slate-800/80 px-2 py-0.5 text-[9px] font-semibold text-emerald-300 hover:bg-slate-700/80"
              >Cancel</button>
            )}
            {done && (
              <div className="flex flex-col items-center text-emerald-400">
                <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="mt-1 text-[10px] font-medium tracking-wide text-emerald-300">Ready</span>
              </div>
            )}
            {file && !uploading && !done && (
              <span className="text-[10px] max-w-[4.5rem] truncate text-emerald-300" title={file.name}>{file.name}</span>
            )}
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />
      </div>
    </div>
  )
}

export default FilePickerButton
