import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

interface DockContextValue {
  mouseX: number | null;
  setMouseX: (value: number | null) => void;
}

const DockContext = createContext<DockContextValue>({
  mouseX: null,
  setMouseX: () => {},
});

interface DockProps {
  children: ReactNode;
  className?: string;
}

export function Dock({ children, className = "" }: DockProps) {
  const [mouseX, setMouseX] = useState<number | null>(null);

  return (
    <DockContext.Provider value={{ mouseX, setMouseX }}>
      <div
        className={`flex items-center gap-2 rounded-2xl px-3 py-2 ${className}`}
        onMouseLeave={() => setMouseX(null)}
        onMouseMove={(event) => setMouseX(event.clientX)}
      >
        {children}
      </div>
    </DockContext.Provider>
  );
}

interface DockItemProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function DockItem({
  children,
  className = "",
  onClick,
}: DockItemProps) {
  const { mouseX } = useContext(DockContext);
  const ref = { current: null as HTMLDivElement | null };

  const distance =
    mouseX !== null && ref.current
      ? Math.abs(
          mouseX -
            (ref.current.getBoundingClientRect().left +
              ref.current.getBoundingClientRect().width / 2)
        )
      : 999;

  const scale =
    distance < 55
      ? 1.18
      : distance < 100
        ? 1.08
        : 1;

  return (
    <div
      ref={(node) => {
        ref.current = node;
      }}
      onClick={onClick}
      className={`group relative flex h-12 w-12 cursor-pointer items-center justify-center transition-transform duration-150 ease-out ${className}`}
      style={{ transform: `scale(${scale})` }}
    >
      {children}
    </div>
  );
}

interface DockIconProps {
  children: ReactNode;
  className?: string;
}

export function DockIcon({ children, className = "" }: DockIconProps) {
  return (
    <div className={`h-6 w-6 ${className}`}>
      {children}
    </div>
  );
}

interface DockLabelProps {
  children: ReactNode;
  className?: string;
}

export function DockLabel({ children, className = "" }: DockLabelProps) {
  return (
    <div
      className={`pointer-events-none absolute -top-10 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-lg border border-[#DED8CF] bg-[#252827] px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 ${className}`}
    >
      {children}
    </div>
  );
}
