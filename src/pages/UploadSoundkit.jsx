import BackButton from '../components/BackButton'

export function UploadSoundkit() {
  return (
    <section className="bg-slate-950/95">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="font-display text-2xl font-semibold text-slate-50">
              Upload Soundkit
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Add drum kits, loop packs and sample folders for artists and producers to download.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/70 bg-rb-gloss-stripes bg-blend-soft-light p-5 shadow-rb-gloss-panel">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-200">Soundkit title</label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-xl border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-red-400 focus:outline-none"
                  placeholder="Island Drum Kit Vol. 1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-200">Short description</label>
                <textarea
                  rows={4}
                  className="mt-1 w-full rounded-xl border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-red-400 focus:outline-none"
                  placeholder="Describe the sounds, genres and mood included in this kit."
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-slate-200">Price (USD)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="mt-1 w-full rounded-xl border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-red-400 focus:outline-none"
                    placeholder="29.99"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-200">Genre / focus</label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-xl border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-red-400 focus:outline-none"
                    placeholder="Dancehall, Trap Dancehall, Afrobeats…"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-200">Cover artwork</label>
                <input
                  type="file"
                  accept="image/*"
                  className="mt-1 block w-full text-xs text-slate-300 file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-900 hover:file:bg-slate-100"
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  Square image, at least 800×800px recommended.
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-200">
                  Preview audio (optional)
                </label>
                <input
                  type="file"
                  accept="audio/*"
                  className="mt-1 block w-full text-xs text-slate-300 file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-900 hover:file:bg-slate-100"
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  Short loop or demo of what&apos;s inside the kit.
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-200">
                  Download archive (ZIP or RAR)
                </label>
                <input
                  type="file"
                  accept=".zip,.rar"
                  className="mt-1 block w-full text-xs text-slate-300 file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-900 hover:file:bg-slate-100"
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  Bundle your WAV/AIFF stems, loops and one‑shots into a single archive file.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              className="rounded-full border border-slate-700/80 bg-slate-900/80 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-slate-500 hover:bg-slate-900"
              onClick={() => window.history.back()}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-full bg-red-500 px-5 py-2 text-xs font-semibold text-slate-50 shadow-rb-gloss-btn hover:bg-red-400"
            >
              Save soundkit
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default UploadSoundkit

