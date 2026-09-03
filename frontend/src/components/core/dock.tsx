import type { ReactNode, HTMLAttributes } from "react";

type DockProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Dock({ children, className = "", ...props }: DockProps) {
  return (
    <div
      {...props}
      className={`flex items-center gap-2 rounded-[22px] px-3 pt-3 ${className}`}
    >
      {children}
    </div>
  );
}

type DockItemProps = HTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function DockItem({
  children,
  className = "",
  ...props
}: DockItemProps) {
  return (
    <button
      type="button"
      {...props}
      className={`group relative flex h-12 w-12 shrink-0 items-center justify-center transition-[transform] duration-200 ease-out origin-bottom hover:z-[200] hover:-translate-y-1 hover:scale-[1.28] focus-visible:z-[200] focus-visible:-translate-y-1 focus-visible:scale-[1.18] ${className}`}
    >
      {children}
    </button>
  );
}

export function DockIcon({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <span className="flex h-6 w-6 items-center justify-center transition-transform duration-200 group-hover:scale-110">
      {children}
    </span>
  );
}

export function DockLabel({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <span className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 z-40 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-lg border border-[#DED8CF] bg-[#FFFCF7] px-2.5 py-1.5 text-[11px] font-bold text-[#252827] opacity-0 shadow-[0_6px_18px_rgba(37,40,39,0.12)] transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
      {children}
    </span>
  );
}
