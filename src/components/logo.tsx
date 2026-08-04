export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="black" />
      <path
        d="M12 13v-2a4 4 0 0 1 8 0v2"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <rect x="8" y="13" width="16" height="12" rx="2" fill="white" />
      <circle cx="24" cy="8" r="3" fill="#6366f1" />
    </svg>
  );
}

export function Logo({
  withWordmark = true,
  className,
}: {
  withWordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LogoMark className="h-7 w-7 shrink-0" />
      {withWordmark && (
        <span className="text-sm font-semibold tracking-tight whitespace-nowrap">
          AI Shopify Builder
        </span>
      )}
    </span>
  );
}
