"use client";

import { useEffect, useState, type CSSProperties } from "react";
import clsx from "clsx";

/**
 * Celebration primitives — spec §4.5. Dependency-free (CSS keyframes only),
 * so a level-up moment costs no bundle weight.
 *
 * Both respect prefers-reduced-motion by *changing what renders*, not just
 * by shortening it: Confetti renders nothing, and DrawnCheck renders its
 * final, fully-drawn state. The meaning (you did it) survives; the movement
 * doesn't.
 */

const COLORS = ["var(--pop-yellow)", "var(--pop-blue)", "var(--pop-pink)", "#000000", "#ffffff"];

interface Piece {
  id: number;
  color: string;
  /** Horizontal travel in px, signed. */
  dx: number;
  /** Peak height in px. */
  dy: number;
  rotate: number;
  delay: number;
  w: number;
  h: number;
  round: boolean;
}

/** Deterministic PRNG so server and client agree if this ever renders on the server. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function makePieces(count: number, seed: number): Piece[] {
  const r = rng(seed);
  return Array.from({ length: count }, (_, id) => ({
    id,
    color: COLORS[id % COLORS.length] ?? "#000000",
    dx: (r() - 0.5) * 320,
    dy: 120 + r() * 140,
    rotate: (r() - 0.5) * 900,
    delay: r() * 120,
    w: 6 + Math.round(r() * 6),
    h: 10 + Math.round(r() * 8),
    round: r() > 0.7,
  }));
}

function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(true); // assume reduced until we know — never flash motion
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const on = () => setReduce(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduce;
}

export interface ConfettiProps {
  /** Change to fire again. */
  fireKey?: number | string;
  count?: number;
  className?: string;
}

/**
 * A one-shot burst from the centre of its (relatively positioned) parent:
 * pieces launch up and out, then fall under "gravity" (the keyframe's
 * second half eases in). Outlined in black like everything else.
 * Decorative only — aria-hidden, pointer-events none.
 */
export function Confetti({ fireKey = 0, count = 28, className }: ConfettiProps) {
  const reduce = usePrefersReducedMotion();
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    if (reduce) return;
    setPieces(makePieces(count, 7 + String(fireKey).length * 131 + count));
    const t = window.setTimeout(() => setPieces([]), 1400);
    return () => window.clearTimeout(t);
  }, [fireKey, count, reduce]);

  if (reduce || pieces.length === 0) return null;

  return (
    <div aria-hidden className={clsx("pointer-events-none absolute inset-0 overflow-visible", className)}>
      {pieces.map((p) => (
        <span
          key={`${fireKey}-${p.id}`}
          className="confetti-piece absolute left-1/2 top-1/2 border-[1.5px] border-black"
          style={
            {
              width: p.w,
              height: p.round ? p.w : p.h,
              borderRadius: p.round ? 999 : 2,
              background: p.color,
              animationDelay: `${p.delay}ms`,
              "--dx": `${p.dx}px`,
              "--dy": `${-p.dy}px`,
              "--rot": `${p.rotate}deg`,
            } as CSSProperties
          }
        />
      ))}
      <style>{`
        .confetti-piece {
          animation: confetti-burst 1100ms both;
        }
        @keyframes confetti-burst {
          0% { transform: translate(-50%, -50%) scale(0.4) rotate(0); opacity: 1;
               animation-timing-function: cubic-bezier(0.2, 0.7, 0.3, 1); }
          40% { transform: translate(calc(-50% + var(--dx) * 0.7), calc(-50% + var(--dy))) scale(1) rotate(calc(var(--rot) * 0.5));
                opacity: 1; animation-timing-function: cubic-bezier(0.5, 0, 1, 0.6); }
          80% { opacity: 1; }
          100% { transform: translate(calc(-50% + var(--dx)), calc(-50% + 160px)) rotate(var(--rot)); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/**
 * A checkmark that draws itself inside a pink sticker that pops in — the
 * "done" moment for a completed quest or objective. The circle lands first
 * (pop curve), then the stroke draws (snap curve, 120ms later).
 */
export function DrawnCheck({ size = 56, className }: { size?: number; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex animate-pop-in items-center justify-center rounded-pill border-thick border-line bg-pink shadow-e1",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        width={size * 0.5}
        height={size * 0.5}
        fill="none"
        stroke="#000"
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12.5l4.5 4.5L19 7.5" strokeDasharray="24" className="animate-check-draw" />
      </svg>
    </span>
  );
}
