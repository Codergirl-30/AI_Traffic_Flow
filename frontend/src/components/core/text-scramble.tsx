import { useEffect, useRef, useState } from "react";

interface TextScrambleProps {
  children: string;
  duration?: number;
  characterSet?: string;
  className?: string;
}

export function TextScramble({
  children,
  duration = 2.2,
  characterSet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  className = "",
}: TextScrambleProps) {
  const [displayText, setDisplayText] = useState(children);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const chars = characterSet || "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const totalFrames = Math.max(30, Math.floor(duration * 30));
    let frame = 0;

    const timer = window.setInterval(() => {
      frame += 1;
      const progress = frame / totalFrames;

      if (progress >= 1) {
        setDisplayText(children);
        window.clearInterval(timer);
        return;
      }

      const revealed = Math.floor(children.length * progress);

      setDisplayText(
        children
          .split("")
          .map((character, index) =>
            index < revealed
              ? character
              : chars[Math.floor(Math.random() * chars.length)]
          )
          .join("")
      );
    }, 1000 / 30);

    return () => window.clearInterval(timer);
  }, [children, duration, characterSet]);

  return <span className={className}>{displayText}</span>;
}
