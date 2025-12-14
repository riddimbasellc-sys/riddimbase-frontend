export default function ScrollableGrid({ children, gridClassName = '' }) {
  return (
    <div className="max-h-[calc(100vh-8rem)] overflow-y-auto overscroll-y-contain pr-1 md:max-h-none md:overflow-visible md:pr-0">
      <div className={gridClassName}>{children}</div>
    </div>
  )
}

