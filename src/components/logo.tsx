export function LogoMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- fixed brand asset, not user content
    <img src="/logo-mark.png" alt="" className={`shrink-0 object-contain ${className ?? ""}`} />
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
