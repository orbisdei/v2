import Link from 'next/link';
import type { Tag } from '@/lib/types';

interface FeaturedTopicPillsProps {
  tags: Tag[];
  heading?: string;
  scrollable?: boolean;
  className?: string;
}

export default function FeaturedTopicPills({
  tags,
  heading = 'Featured Topics',
  scrollable = true,
  className,
}: FeaturedTopicPillsProps) {
  if (tags.length === 0) return null;
  const listCls = scrollable
    ? 'flex gap-2 overflow-x-auto scrollbar-hide pb-1 px-3.5'
    : 'flex flex-wrap gap-2 px-3.5';
  return (
    <div className={className}>
      {heading && (
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3.5">
          {heading}
        </h3>
      )}
      <div className={listCls}>
        {tags.map((tag) => (
          <Link
            key={tag.id}
            href={`/tag/${tag.id}`}
            className="inline-flex items-center shrink-0 min-h-[36px] px-3 text-xs font-medium border border-gray-200 rounded-full hover:bg-navy-50 hover:border-navy-300 transition-colors text-navy-800 whitespace-nowrap"
          >
            {tag.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
