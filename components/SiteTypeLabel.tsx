import { Church, House, Landmark, Castle, type LucideIcon } from 'lucide-react';
import { SITE_TYPE_LABELS, type SiteType } from '@/lib/types';

// Icon-per-type, chosen deliberately (see CLAUDE.md → sites.type):
// Church (active-church), House (active-community — the community's home),
// Landmark (other-religious), Castle (heritage/ruins). The map pin glyphs in
// MapView.tsx mirror this mapping with raw SVG paths — change both together.
export const SITE_TYPE_ICONS: Record<SiteType, LucideIcon> = {
  'active-church': Church,
  'active-community': House,
  'other-religious': Landmark,
  heritage: Castle,
};

interface SiteTypeLabelProps {
  type?: string | null;
  /** sm = 12px text / 13px icon (mobile meta row), md = inherits text size / 14px icon */
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Inline icon + label for a site's type, rendered in site-detail metadata rows
 * next to the interest level. Renders nothing for untyped sites (pre-migration).
 */
export default function SiteTypeLabel({ type, size = 'md', className }: SiteTypeLabelProps) {
  if (!type || !(type in SITE_TYPE_ICONS)) return null;
  const Icon = SITE_TYPE_ICONS[type as SiteType];
  const label = SITE_TYPE_LABELS[type as SiteType];
  return (
    <span
      className={[
        'inline-flex items-center gap-1 text-gray-500',
        size === 'sm' ? 'text-[12px]' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Icon size={size === 'sm' ? 13 : 14} aria-hidden="true" />
      {label}
    </span>
  );
}
