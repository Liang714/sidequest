import clsx from "clsx";
import { AlertCircle } from "lucide-react";
import { Avatar } from "./avatar";

/**
 * ChatBubble — spec §F4. In CREW the room's conversation IS the product,
 * so this carries more weight than a typical chat primitive.
 *
 * Three kinds, and the system kind matters: check-ins and joins render as
 * centred, low-contrast system lines rather than fake messages, so the
 * transcript never puts words in a participant's mouth.
 *
 * A failed send stays visible with a retry rather than vanishing — losing a
 * message silently in a group you're about to meet in person is the worst
 * possible failure mode here.
 */

export type BubbleStatus = "sending" | "sent" | "failed";

export interface ChatBubbleProps {
  kind: "mine" | "theirs" | "system";
  text: string;
  /** Required for `theirs` — a bubble without attribution is unreadable. */
  senderName?: string;
  senderId?: string;
  senderAvatarUrl?: string | null;
  /** Hide the avatar/name when the previous message was from the same person. */
  grouped?: boolean;
  status?: BubbleStatus;
  onRetry?: () => void;
  className?: string;
}

export function ChatBubble({
  kind,
  text,
  senderName,
  senderId,
  senderAvatarUrl,
  grouped = false,
  status = "sent",
  onRetry,
  className,
}: ChatBubbleProps) {
  if (kind === "system") {
    return (
      <p className={clsx("py-2 text-center text-caption text-ink-faint", className)}>{text}</p>
    );
  }

  const mine = kind === "mine";

  return (
    <div className={clsx("flex gap-2", mine && "justify-end", className)}>
      {!mine && (
        <div className="w-8 shrink-0">
          {!grouped && senderName && (
            <Avatar
              name={senderName}
              userId={senderId ?? senderName}
              src={senderAvatarUrl}
              size="sm"
              ringClassName="border-transparent"
            />
          )}
        </div>
      )}

      <div className={clsx("max-w-[78%]", mine && "flex flex-col items-end")}>
        {!mine && !grouped && senderName && (
          <p className="mb-1 text-caption text-ink-faint">{senderName}</p>
        )}
        <div
          className={clsx(
            "rounded-bubble px-3 py-2 text-body-s",
            // The 5px tail corner is what makes a bubble read as speech
            // rather than as a card.
            mine ? "rounded-br-[5px]" : "rounded-bl-[5px]",
            // A failed send drops the normal fill entirely. An outline in
            // danger over bg-hot is invisible — #FF6B5B on #FF6A3D — and a
            // message that failed must never look like one that sent.
            status === "failed"
              ? "border border-danger bg-danger-soft text-danger-text"
              : mine
                ? "bg-hot text-on-hot"
                : "bg-surface-elevated text-ink",
            status === "sending" && "opacity-60",
          )}
        >
          {text}
        </div>
        {status === "failed" && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-1 inline-flex items-center gap-1 text-caption text-danger-text"
          >
            <AlertCircle aria-hidden className="h-3.5 w-3.5" />
            Didn&rsquo;t send — tap to retry
          </button>
        )}
      </div>
    </div>
  );
}
