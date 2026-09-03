import {
  Utensils,
  Coffee,
  Gamepad2,
  Camera,
  Music4,
  Clapperboard,
  Palette,
  Bike,
  Footprints,
  Disc3,
  ShoppingBag,
  Dices,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "@/lib/types";

/**
 * Lucide icon per quest category — replaces the emoji map.
 *
 * Emoji render differently on every OS, can't take on state colour, and
 * can't be sized reliably. They were the loudest "unfinished" cue in the
 * product (spec §A1 finding 4). Emoji survive only in user-authored chat.
 */
const ICONS: Record<Category, LucideIcon> = {
  food: Utensils,
  cafe: Coffee,
  gaming: Gamepad2,
  photography: Camera,
  dance: Music4,
  movies: Clapperboard,
  art: Palette,
  sports: Bike,
  exploration: Footprints,
  music: Disc3,
  shopping: ShoppingBag,
  random: Dices,
};

export function CategoryIcon({
  category,
  className = "h-4 w-4",
}: {
  category: Category;
  className?: string;
}) {
  const Icon = ICONS[category] ?? Dices;
  // Decorative: every use site pairs this with a text label, so the icon
  // is never the sole carrier of meaning (spec §K).
  return <Icon aria-hidden className={className} />;
}
