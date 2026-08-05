import { formatDistance, type DistanceUnit } from '@/lib/geo';

interface DistanceBadgeProps {
  meters: number;
  unit?: DistanceUnit;
  className?: string;
}

/**
 * "170m" / "357mi" — the one distance chip, used wherever a site is shown
 * relative to the user: Around Me list rows, map popup cards, the floating pin
 * card, tag and list pages sorted by distance, and site detail.
 *
 * Gold-tinted rather than navy so it reads as metadata about *your* position
 * rather than a property of the site. tabular-nums keeps a column of distances
 * from jittering as the digits change.
 */
export default function DistanceBadge({ meters, unit = 'km', className }: DistanceBadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full bg-[#fef8e0] px-1.5 py-px text-[10px] font-semibold text-[#8a6d0b] tabular-nums ${className ?? ''}`}
    >
      {formatDistance(meters, unit)}
    </span>
  );
}
