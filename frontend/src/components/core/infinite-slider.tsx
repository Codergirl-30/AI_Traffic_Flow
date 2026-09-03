import { type ReactNode } from "react";

interface InfiniteSliderProps {
  children: ReactNode;
  gap?: number;
  reverse?: boolean;
  duration?: number;
}

export function InfiniteSlider({
  children,
  gap = 24,
  reverse = false,
  duration = 30,
}: InfiniteSliderProps) {
  return (
    <div className="relative w-full overflow-hidden">
      <div
        className="flex w-max items-center"
        style={{
          gap: `${gap}px`,
          animation: `infinite-slider-scroll ${duration}s linear infinite`,
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        <div
          className="flex shrink-0 items-center"
          style={{ gap: `${gap}px` }}
        >
          {children}
        </div>

        <div
          className="flex shrink-0 items-center"
          style={{ gap: `${gap}px` }}
          aria-hidden="true"
        >
          {children}
        </div>
      </div>

      <style>{`
        @keyframes infinite-slider-scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(calc(-50% - ${gap / 2}px));
          }
        }
      `}</style>
    </div>
  );
}