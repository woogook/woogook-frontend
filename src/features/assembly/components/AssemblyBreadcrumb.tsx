import Link from "next/link";

import { cn } from "@/lib/utils";

export type AssemblyBreadcrumbItem = {
  label: string;
  href?: string;
};

export function AssemblyBreadcrumb({
  items,
  className,
}: {
  items: AssemblyBreadcrumbItem[];
  className?: string;
}) {
  const visibleItems = items.filter((item) => item.label.trim().length > 0);
  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="현재 위치"
      className={cn("-mx-1 mb-4 overflow-x-auto px-1", className)}
      style={{ color: "var(--text-tertiary)" }}
    >
      <ol className="flex min-w-max items-center gap-1.5 whitespace-nowrap text-[12px]">
        {visibleItems.map((item, index) => {
          const isCurrent = index === visibleItems.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {item.href && !isCurrent ? (
                <Link
                  href={item.href}
                  className="rounded px-1 py-1 font-medium transition-colors hover:underline active:opacity-70"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className="rounded px-1 py-1 font-semibold"
                  aria-current={isCurrent ? "page" : undefined}
                  style={{ color: isCurrent ? "var(--navy)" : "var(--text-secondary)" }}
                >
                  {item.label}
                </span>
              )}
              {index < visibleItems.length - 1 ? (
                <span aria-hidden style={{ color: "var(--border-dark)" }}>
                  ›
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
