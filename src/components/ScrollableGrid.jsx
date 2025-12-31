export default function ScrollableGrid({ children, gridClassName = '' }) {
  return (
    <div className="h-[calc(100vh-120px)] overflow-y-auto overscroll-contain pr-1 md:h-auto md:overflow-visible md:pr-0">
      <div className={gridClassName}>{children}</div>
    </div>
  )
}

