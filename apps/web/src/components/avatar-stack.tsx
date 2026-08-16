import clsx from "clsx";
import { avatarColorFor, initialFromUsername } from "@/lib/format";

export interface AvatarPerson {
  id: string;
  username: string;
}

const colorVar: Record<string, string> = {
  blue: "var(--accent-blue)",
  violet: "var(--accent-violet)",
  coral: "var(--accent-coral)",
  lime: "var(--accent-lime)",
};

export function AvatarStack({ people, max = 4 }: { people: AvatarPerson[]; max?: number }) {
  const shown = people.slice(0, max);
  const overflow = people.length - shown.length;

  return (
    <div className="flex">
      {shown.map((p, i) => (
        <div
          key={p.id}
          className={clsx(
            "flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-surface font-display text-[13px] font-semibold text-white",
            i > 0 && "-ml-3",
          )}
          style={{ background: colorVar[avatarColorFor(p.id)] }}
          title={p.username}
        >
          {initialFromUsername(p.username)}
        </div>
      ))}
      {overflow > 0 && (
        <div className="-ml-3 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-surface bg-surface-elevated font-display text-[12px] font-semibold text-ink-muted">
          +{overflow}
        </div>
      )}
    </div>
  );
}
