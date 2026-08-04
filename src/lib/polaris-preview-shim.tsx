import * as React from "react";
import type { ReactNode } from "react";

/**
 * Tailwind-styled lookalikes for the handful of @shopify/polaris components generated admin
 * screens actually use (see CODEGEN_SYSTEM_PROMPT in src/lib/ai/generate.ts). Used only to render
 * a visual preview of generated JSX in the browser — not the real Polaris package, no network/CSS
 * dependency, so it can't render every possible prop combination faithfully.
 */

function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function Page({
  title,
  subtitle,
  primaryAction,
  children,
}: {
  title?: string;
  subtitle?: string;
  primaryAction?: { content?: string } | ReactNode;
  children?: ReactNode;
}) {
  const actionLabel =
    primaryAction && typeof primaryAction === "object" && "content" in (primaryAction as object)
      ? (primaryAction as { content?: string }).content
      : null;
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          {title && <h1 className="text-xl font-semibold text-[#1a1a1a]">{title}</h1>}
          {subtitle && <p className="mt-0.5 text-sm text-[#6d7175]">{subtitle}</p>}
        </div>
        {actionLabel && (
          <button className="shrink-0 rounded-lg bg-[#008060] px-3.5 py-2 text-sm font-medium text-white">
            {actionLabel}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

export function Layout({ children }: { children?: ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}
Layout.Section = function LayoutSection({ children }: { children?: ReactNode }) {
  return <div className="space-y-4">{children}</div>;
};

export function Card({ children }: { children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-[#e3e3e3] bg-white p-4 shadow-sm">{children}</div>
  );
}

export function BlockStack({ children, gap }: { children?: ReactNode; gap?: string | number }) {
  return <div className={cx("flex flex-col", gap ? "gap-3" : "gap-2")}>{children}</div>;
}

export function InlineStack({
  children,
  align,
  gap,
}: {
  children?: ReactNode;
  align?: string;
  gap?: string | number;
}) {
  return (
    <div
      className={cx(
        "flex flex-row items-center",
        gap ? "gap-3" : "gap-2",
        align === "space-between" && "justify-between",
        align === "end" && "justify-end",
        align === "center" && "justify-center",
      )}
    >
      {children}
    </div>
  );
}

export function Text({
  as: As = "span",
  variant,
  tone,
  children,
}: {
  as?: React.ElementType;
  variant?: string;
  tone?: string;
  children?: ReactNode;
}) {
  const size = variant?.startsWith("heading") ? "text-base font-semibold" : "text-sm";
  const color = tone === "subdued" || tone === "disabled" ? "text-[#6d7175]" : tone === "critical" ? "text-red-600" : "text-[#1a1a1a]";
  return <As className={cx(size, color)}>{children}</As>;
}

export function Badge({ children, tone }: { children?: ReactNode; tone?: string }) {
  const palette =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "critical"
        ? "bg-red-50 text-red-700"
        : tone === "warning"
          ? "bg-amber-50 text-amber-700"
          : "bg-black/5 text-black/70";
  return <span className={cx("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", palette)}>{children}</span>;
}

export function Box({ children, padding }: { children?: ReactNode; padding?: string | number }) {
  return <div className={padding ? "p-3" : undefined}>{children}</div>;
}

export function Button({
  children,
  variant,
  onClick,
  submit,
}: {
  children?: ReactNode;
  variant?: string;
  onClick?: () => void;
  submit?: boolean;
}) {
  const primary = variant === "primary";
  return (
    <button
      type={submit ? "submit" : "button"}
      onClick={onClick}
      className={cx(
        "rounded-lg px-3.5 py-2 text-sm font-medium",
        primary ? "bg-[#008060] text-white" : "border border-[#c9cccf] bg-white text-[#1a1a1a]",
      )}
    >
      {children}
    </button>
  );
}

export function TextField({
  label,
  value,
  placeholder,
  multiline,
}: {
  label?: string;
  value?: string;
  placeholder?: string;
  multiline?: boolean | number;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="block space-y-1">
      {label && <span className="text-xs font-medium text-[#1a1a1a]">{label}</span>}
      {multiline ? (
        <textarea
          readOnly
          value={value ?? ""}
          placeholder={placeholder}
          className="w-full rounded-lg border border-[#c9cccf] px-3 py-2 text-sm"
          rows={typeof multiline === "number" ? multiline : 3}
        />
      ) : (
        <input
          readOnly
          value={value ?? ""}
          placeholder={placeholder}
          className="w-full rounded-lg border border-[#c9cccf] px-3 py-2 text-sm"
        />
      )}
    </label>
  );
}

export function Banner({
  title,
  tone,
  children,
}: {
  title?: string;
  tone?: string;
  children?: ReactNode;
}) {
  const palette =
    tone === "critical"
      ? "border-red-200 bg-red-50 text-red-800"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-sky-200 bg-sky-50 text-sky-800";
  return (
    <div className={cx("rounded-lg border p-3 text-sm", palette)}>
      {title && <p className="font-medium">{title}</p>}
      {children}
    </div>
  );
}

export function EmptyState({
  heading,
  children,
}: {
  heading?: string;
  image?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1 py-10 text-center">
      {heading && <p className="text-sm font-medium text-[#1a1a1a]">{heading}</p>}
      <div className="text-sm text-[#6d7175]">{children}</div>
    </div>
  );
}

export function DataTable({
  columnContentTypes,
  headings,
  rows,
}: {
  columnContentTypes?: string[];
  headings?: ReactNode[];
  rows?: ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[#e3e3e3]">
            {(headings ?? []).map((h, i) => (
              <th key={i} className="px-2 py-2 font-medium text-[#6d7175]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(rows ?? []).length === 0 ? (
            <tr>
              <td className="px-2 py-4 text-[#6d7175]" colSpan={(headings ?? columnContentTypes ?? []).length || 1}>
                No data yet.
              </td>
            </tr>
          ) : (
            (rows ?? []).map((row, i) => (
              <tr key={i} className="border-b border-[#f1f1f1] last:border-0">
                {row.map((cell, j) => (
                  <td key={j} className="px-2 py-2 text-[#1a1a1a]">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function IndexTable(props: { children?: ReactNode; emptyState?: ReactNode }) {
  return <div className="space-y-2">{props.emptyState ?? props.children}</div>;
}
IndexTable.Row = function IndexTableRow({ children }: { children?: ReactNode }) {
  return <div className="border-b border-[#f1f1f1] py-2 text-sm last:border-0">{children}</div>;
};
IndexTable.Cell = function IndexTableCell({ children }: { children?: ReactNode }) {
  return <span className="mr-3 inline-block">{children}</span>;
};

export function Spinner() {
  return <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black/60" />;
}

export function Divider() {
  return <hr className="border-[#e3e3e3]" />;
}
