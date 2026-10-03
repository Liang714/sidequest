/**
 * Bold Pop design system primitives.
 * Spec: docs/superpowers/specs/2026-10-03-bold-pop-design.md (visual + motion);
 * product rules (Rule of Faces, IA) carried from 2026-08-27-crew-ui-design.md
 * Live preview: /dev/kitchen-sink (dev only)
 */
export { Button } from "./button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./button";

export { Avatar, FaceStack } from "./avatar";
export type { AvatarProps, AvatarSize, FaceStackProps } from "./avatar";

export { Chip } from "./chip";
export type { ChipProps, ChipTone } from "./chip";

export { Badge } from "./badge";
export type { BadgeProps, BadgeTone } from "./badge";

export {
  EmptyState,
  ErrorState,
  OfflineBanner,
  Skeleton,
  CrewCardSkeleton,
  PersonRowSkeleton,
} from "./states";
export type { EmptyStateProps, ErrorStateProps } from "./states";

export { PersonRow } from "./person-row";
export type { PersonRowProps, PersonRelation } from "./person-row";

export { CrewCard } from "./crew-card";
export type { CrewCardProps, CrewCardVariant } from "./crew-card";

export { ChatBubble } from "./chat-bubble";
export type { ChatBubbleProps, BubbleStatus } from "./chat-bubble";

export { CheckInStrip } from "./check-in-strip";
export type { CheckInStripProps } from "./check-in-strip";

export { PresenceStrip } from "./presence-strip";
export type { PresenceStripProps } from "./presence-strip";

export { XPBar, CompatBadge } from "./progress";
export type { XPBarProps, CompatBadgeProps } from "./progress";

export { Sheet } from "./sheet";
export type { SheetProps } from "./sheet";
