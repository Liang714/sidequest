import clsx from "clsx";

export function MapPin({
  x,
  y,
  emoji,
  kind = "quest",
  label,
}: {
  x: number;
  y: number;
  emoji: string;
  kind?: "quest" | "business" | "friend";
  label?: string;
}) {
  return (
    <div
      className="group absolute -translate-x-1/2 -translate-y-full"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <div
        className={clsx(
          "flex h-9 w-9 items-center justify-center rounded-full border-2 border-surface text-[15px] shadow-card",
          kind === "quest" && "bg-blue",
          kind === "business" && "bg-violet",
          kind === "friend" && "bg-lime",
        )}
      >
        {emoji}
      </div>
      {label && (
        <div className="pointer-events-none absolute left-1/2 top-full mt-1 w-max -translate-x-1/2 rounded-button border border-line bg-surface px-2 py-1 font-mono text-[11px] text-ink opacity-0 shadow-card transition-opacity group-hover:opacity-100">
          {label}
        </div>
      )}
    </div>
  );
}
