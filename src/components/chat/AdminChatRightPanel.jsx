export function AdminChatRightPanel({ activeConversationId }) {
  // TODO: fetch real user profile for the active conversation
  const user = null

  return (
    <aside className="hidden xl:flex w-72 border-l border-slate-800/70 bg-slate-950/80 backdrop-blur-xl flex-col px-4 py-4">
      <h2 className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-400">
        User Profile
      </h2>
      {!activeConversationId || !user ? (
        <p className="mt-3 text-[11px] text-slate-500">
          Select a conversation to view user details.
        </p>
      ) : (
        <>
          <div className="mt-3 rounded-2xl border border-slate-800/80 bg-slate-900/70 p-3 text-[11px] text-slate-100 space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-[13px] font-semibold">
                {user.initials}
              </div>
              <div>
                <p className="font-semibold">{user.display_name}</p>
                <p className="text-[10px] text-slate-400">{user.email}</p>
              </div>
            </div>
            <p className="text-[10px] text-emerald-300">Status: Active</p>
          </div>
          <div className="mt-3 space-y-2 text-[11px]">
            <button className="w-full rounded-full border border-rose-500/80 bg-rose-600/10 px-3 py-1.5 text-rose-300 hover:bg-rose-600/20">
              Block user
            </button>
            <button className="w-full rounded-full border border-amber-500/80 bg-amber-500/10 px-3 py-1.5 text-amber-200 hover:bg-amber-500/20">
              Report user
            </button>
          </div>
        </>
      )}
    </aside>
  )
}
