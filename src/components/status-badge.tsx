const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-black/5 text-black/50",
  PLANNING: "bg-amber-50 text-amber-700",
  GENERATING: "bg-amber-50 text-amber-700",
  READY: "bg-emerald-50 text-emerald-700",
  FAILED: "bg-red-50 text-red-700",
};

const PULSING = new Set(["PLANNING", "GENERATING"]);

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${style}`}>
      {PULSING.has(status) && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
