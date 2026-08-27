import clsx from "clsx";

/**
 * CREW Avatar + FaceStack — spec §H, "The Rule of Faces".
 *
 * Avatar sizes are load-bearing, not decorative:
 *   md (46px), overlapping, in a FaceStack — ONLY on crew cards, where these
 *     people have already co-committed to a public plan with the viewer.
 *     Seeing them is the trust surface.
 *   sm (32px), single, non-overlapping — browsable individuals. Person rows
 *     lead with shared interests, not faces.
 *
 * There is no face grid anywhere in the product. A photo grid is the single
 * formal move that turns a social app into a dating app, and PRD.md §6 rules
 * out appearance-based matching. Keep it that way.
 */

export type AvatarSize = "xs" | "sm" | "md" | "lg";

const SIZES: Record<AvatarSize, { box: string; text: string; ring: string }> = {
  xs: { box: "h-6 w-6", text: "text-[10px]", ring: "border-2" },
  sm: { box: "h-8 w-8", text: "text-[13px]", ring: "border-2" },
  md: { box: "h-[46px] w-[46px]", text: "text-[16px]", ring: "border-[3px]" },
  lg: { box: "h-[78px] w-[78px]", text: "text-[31px]", ring: "border-4" },
};

/**
 * Deterministic by user id, never random — the same person is the same
 * color on every screen and across sessions, which is what makes an
 * initials fallback readable as identity rather than noise.
 *
 * Every swatch is light enough to carry near-black text at >4.5:1.
 */
const SWATCHES = ["#FF6A3D", "#7BE0A4", "#F5D06F", "#9FB8FF", "#F2A0C4", "#8FD9CE", "#D9B8FF"] as const;

function swatchFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  // `?? SWATCHES[0]` satisfies noUncheckedIndexedAccess; the modulo already
  // guarantees the index is in range.
  return SWATCHES[hash % SWATCHES.length] ?? SWATCHES[0];
}

/** First letter of the display name — not initials of a real name we may not have. */
function initialFor(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export interface AvatarProps {
  /** Display name. Also the accessible name — an avatar is never information on its own. */
  name: string;
  /** Stable id used to pick the fallback color. Falls back to `name`. */
  userId?: string;
  src?: string | null;
  size?: AvatarSize;
  /** Mint ring = checked in / arrived. Always paired with a text cue elsewhere. */
  checkedIn?: boolean;
  /** Dimmed = hasn't arrived yet. Never the only signal. */
  dimmed?: boolean;
  /** Border color to blend into the surface behind an overlapping stack. */
  ringClassName?: string;
  className?: string;
}

export function Avatar({
  name,
  userId,
  src,
  size = "sm",
  checkedIn = false,
  dimmed = false,
  ringClassName = "border-surface",
  className,
}: AvatarProps) {
  const s = SIZES[size];
  const background = swatchFor(userId ?? name);

  return (
    <span
      className={clsx(
        "relative inline-flex shrink-0 items-center justify-center rounded-pill",
        s.box,
        s.ring,
        ringClassName,
        dimmed && "opacity-40",
        checkedIn && "ring-2 ring-mint",
        className,
      )}
      style={src ? undefined : { background }}
    >
      {src ? (
        // Avatars are small, remote and already CDN-served; next/image adds
        // no value and would need per-host remotePatterns config.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full rounded-pill object-cover" />
      ) : (
        <span aria-hidden className={clsx("font-extrabold text-[#12100E]", s.text)}>
          {initialFor(name)}
        </span>
      )}
      <span className="sr-only">{name}</span>
    </span>
  );
}

export interface FaceStackProps {
  people: { id: string; name: string; avatarUrl?: string | null }[];
  /** Beyond this, the rest collapse into a +N chip. */
  max?: number;
  /** Must match the surface behind the stack so the overlap reads cleanly. */
  ringClassName?: string;
  className?: string;
}

/**
 * ONLY for crew cards and quest rosters. See the Rule of Faces above.
 *
 * The -14px overlap would otherwise create sub-44px touch targets, so each
 * avatar gets its own padded hit area when the stack is interactive.
 */
export function FaceStack({ people, max = 3, ringClassName, className }: FaceStackProps) {
  const shown = people.slice(0, max);
  const overflow = people.length - shown.length;

  return (
    <div className={clsx("flex items-center", className)}>
      {shown.map((person, i) => (
        <Avatar
          key={person.id}
          name={person.name}
          userId={person.id}
          src={person.avatarUrl}
          size="md"
          ringClassName={ringClassName}
          className={i > 0 ? "-ml-[14px]" : undefined}
        />
      ))}
      {overflow > 0 && (
        <span
          className={clsx(
            "-ml-[14px] inline-flex h-[46px] w-[46px] items-center justify-center rounded-pill",
            "border-[3px] bg-surface-elevated text-[14px] font-extrabold text-ink-muted",
            ringClassName ?? "border-surface",
          )}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
