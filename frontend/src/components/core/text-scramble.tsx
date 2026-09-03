import { useEffect, useRef, useState } from "react";

interface TextScrambleProps {
  children: string;
  duration?: number;
  characterSet?: string;
  className?: string;
}

export function TextScramble({
  children,
  duration = 1.2,
  characterSet = ". ",
  className = "",
}: TextScrambleProps) {
  const [displayText, setDisplayText] = useState(children);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const chars = characterSet.length > 0 ? characterSet : ". ";
    const totalFrames = Math.max(8, Math.floor(duration * 30));
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

      const scrambled = children
        .split("")
        .map((character, index) => {
          if (index < revealed) return character;
          return chars[Math.floor(Math.random() * chars.length)];
        })
        .join("");

      setDisplayText(scrambled);
    }, 1000 / 30);

    return () => window.clearInterval(timer);
  }, [children, duration, characterSet]);

  return <span className={className}>{displayText}</span>;
}
