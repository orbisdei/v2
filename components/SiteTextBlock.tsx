import SiteDescription from './SiteDescription';
import DistanceBadge from './DistanceBadge';
import type { DistanceUnit } from '@/lib/geo';

type Size = 'sm' | 'md';

interface SiteTextBlockProps {
  name: string;
  location: string;
  description?: string;
  size?: Size;
  className?: string;
  /** When set, a distance chip leads the location line. */
  distanceMeters?: number;
  distanceUnit?: DistanceUnit;
}

const NAME_CLS: Record<Size, string> = {
  sm: 'font-serif font-semibold text-navy-900 line-clamp-2 leading-snug text-[13px]',
  md: 'font-serif font-semibold text-navy-900 line-clamp-2 leading-snug text-[15px]',
};

const LOCATION_CLS: Record<Size, string> = {
  sm: 'text-gray-500 truncate mt-0 text-[11px]',
  md: 'text-gray-500 truncate mt-1 text-[12px]',
};

const DESC_CLS: Record<Size, string> = {
  sm: 'text-gray-600 line-clamp-2 leading-normal mt-0.5 text-[11px]',
  md: 'text-gray-600 line-clamp-3 leading-normal mt-1 text-[12px]',
};

// With a distance chip the location line becomes a flex row, so `truncate` has
// to move off the container and onto the text span — a truncating flex parent
// clips nothing.
const LOCATION_ROW_CLS: Record<Size, string> = {
  sm: 'text-gray-500 mt-0 text-[11px] flex items-center gap-1.5 min-w-0',
  md: 'text-gray-500 mt-1 text-[12px] flex items-center gap-1.5 min-w-0',
};

export default function SiteTextBlock({
  name,
  location,
  description,
  size = 'sm',
  className,
  distanceMeters,
  distanceUnit,
}: SiteTextBlockProps) {
  return (
    <div className={`min-w-0 ${className ?? ''}`}>
      <div className={NAME_CLS[size]}>{name}</div>
      {distanceMeters === undefined ? (
        <div className={LOCATION_CLS[size]}>{location}</div>
      ) : (
        <div className={LOCATION_ROW_CLS[size]}>
          <DistanceBadge meters={distanceMeters} unit={distanceUnit} />
          <span className="truncate">{location}</span>
        </div>
      )}
      {description && <SiteDescription text={description} className={DESC_CLS[size]} />}
    </div>
  );
}
