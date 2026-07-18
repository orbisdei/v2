import TagPill from './TagPill';
import type { Tag } from '@/lib/types';

const TYPE_ORDER: Record<string, number> = { country: 0, region: 1, municipality: 2 };

interface SiteTagPillsProps {
  tags: Tag[];
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * A site's tag chips: location tags first (country → region → municipality),
 * a divider, then topic tags. Used by the site detail page (mobile + desktop
 * layouts). Renders nothing when there are no tags.
 */
export default function SiteTagPills({ tags, size = 'md', className = '' }: SiteTagPillsProps) {
  if (tags.length === 0) return null;

  const locationTags = tags
    .filter((t) => t.type && t.type !== 'topic')
    .sort((a, b) => (TYPE_ORDER[a.type!] ?? 9) - (TYPE_ORDER[b.type!] ?? 9));
  const topicTags = tags.filter((t) => !t.type || t.type === 'topic');

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {locationTags.map((tag) => (
        <TagPill key={tag.id} href={`/tag/${tag.id}`} variant="location" size={size}>
          {tag.name}
        </TagPill>
      ))}
      {locationTags.length > 0 && topicTags.length > 0 && (
        <span className="w-px h-4 bg-gray-300 mx-0.5" />
      )}
      {topicTags.map((tag) => (
        <TagPill key={tag.id} href={`/tag/${tag.id}`} variant="topic" size={size}>
          {tag.name}
        </TagPill>
      ))}
    </div>
  );
}
