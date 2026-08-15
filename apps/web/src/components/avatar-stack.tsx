import type { QuestUser } from "@/lib/types";
import clsx from "clsx";

const colorVar: Record<QuestUser["avatarColor"], string> = {
  blue: "var(--accent-blue)",
  violet: "var(--accent-violet)",
  coral: "var(--accent-coral)",
  lime: "var(--accent-lime)",
};

export function AvatarStack({ users, max = 4 }: { users: QuestUser[]; max?: number }) {
  const shown = users.slice(0, max);
  const overflow = users.length - shown.length;

  return (
    <div className="flex">
      {shown.map((u, i) => (
        <div
          key={u.id}
          className={clsx(
            "flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-surface font-display text-[13px] font-semibold text-white",
            i > 0 && "-ml-3",
          )}
          style={{ background: colorVar[u.avatarColor] }}
          title={u.username}
        >
          {u.avatarInitial}
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
