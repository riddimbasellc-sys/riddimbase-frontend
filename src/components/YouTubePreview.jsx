import useYouTubeFeed from '../hooks/useYouTubeFeed'

export default function YouTubePreview({ youtubeUrl }) {
  const { videos, loading, error } = useYouTubeFeed(youtubeUrl)
  if (!youtubeUrl) return null
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2"><YouTubeIcon className="h-4 w-4 text-red-500" /> Recent YouTube Uploads</h3>
        <a href={youtubeUrl} target="_blank" rel="noreferrer" className="rounded-full border border-slate-700/70 bg-slate-800/40 backdrop-blur px-3 py-1 text-[11px] font-medium text-slate-300 hover:border-red-500/60 hover:text-red-400 transition">Watch More →</a>
      </div>
      {loading && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_,i) => (
            <div key={i} className="relative h-28 w-full rounded-xl border border-slate-800/70 bg-slate-900/60 overflow-hidden animate-pulse">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800/40 to-slate-900/40" />
            </div>
          ))}
        </div>
      )}
      {!loading && error && <p className="text-[11px] text-red-400 mb-3">Feed unavailable (showing samples).</p>}
      {!loading && (
        <div className="mt-2 grid gap-4 sm:grid-cols-3">
          {videos.map(v => (
            <a key={v.videoId} href={`https://www.youtube.com/watch?v=${v.videoId}`} target="_blank" rel="noreferrer" className="group relative rounded-xl overflow-hidden border border-slate-800/70 bg-slate-900/70">
              <img src={`https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`} alt={v.title} className="h-28 w-full object-cover group-hover:scale-[1.05] transition duration-300" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/0 to-slate-950/0 group-hover:from-slate-950/95 group-hover:via-slate-950/40" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <div className="flex items-center gap-2 rounded-full bg-red-600/90 px-3 py-1 text-[11px] font-semibold text-white shadow-lg">
                  <PlayIcon className="h-3 w-3" /> Play
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-2 pointer-events-none">
                <p className="text-[10px] font-semibold text-slate-100 line-clamp-2 leading-tight drop-shadow">{v.title}</p>
              </div>
            </a>
          ))}
          {videos.length===0 && <p className="text-[11px] text-slate-500">No videos found.</p>}
        </div>
      )}
    </div>
  )
}

function YouTubeIcon(props){return(<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}><path d="M23.498 6.186a2.986 2.986 0 0 0-2.103-2.103C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.395.583A2.986 2.986 0 0 0 .502 6.186C-.08 8.076-.08 12-.08 12s0 3.924.582 5.814a2.986 2.986 0 0 0 2.103 2.103C4.495 20.5 12 20.5 12 20.5s7.505 0 9.395-.583a2.986 2.986 0 0 0 2.103-2.103C24.08 15.924 24.08 12 24.08 12s0-3.924-.582-5.814ZM9.75 15.5v-7l6 3.5-6 3.5Z"/></svg>)}
function PlayIcon(props){return(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="6 3 20 12 6 21 6 3"/></svg>)}
