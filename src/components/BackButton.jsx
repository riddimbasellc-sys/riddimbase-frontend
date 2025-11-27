import { useNavigate } from 'react-router-dom'

export default function BackButton({ label = 'Back' }) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className="group inline-flex items-center gap-1 rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-[11px] font-medium text-slate-300 hover:border-emerald-400/70 hover:text-emerald-300 transition"
      aria-label={label}
    >
      <svg
        className="h-3.5 w-3.5 -ml-0.5 transition-transform group-hover:-translate-x-0.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 6l-6 6 6 6" />
      </svg>
      <span>{label}</span>
    </button>
  )
}
