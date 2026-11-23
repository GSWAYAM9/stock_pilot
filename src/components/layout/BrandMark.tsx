export function BrandMark({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <svg
        width="28"
        height="28"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-hidden="true"
      >
        <rect width="32" height="32" rx="8" fill="url(#sp_grad)" />
        <path
          d="M9.5 12L16 8.2L22.5 12V20L16 23.8L9.5 20V12Z"
          stroke="white"
          strokeWidth="1.9"
          strokeLinejoin="round"
        />
        <path
          d="M9.5 12L16 15.8L22.5 12M16 15.8V23.8"
          stroke="white"
          strokeWidth="1.9"
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient id="sp_grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor="#4F46E5" />
            <stop offset="1" stopColor="#6366F1" />
          </linearGradient>
        </defs>
      </svg>
      {!collapsed ? (
        <span className="text-[15px] font-bold tracking-tight text-[var(--text-primary)] whitespace-nowrap">
          StockPilot
        </span>
      ) : null}
    </div>
  );
}
