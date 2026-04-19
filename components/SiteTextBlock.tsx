import SiteDescription from './SiteDescription';

type Size = 'sm' | 'md';

interface SiteTextBlockProps {
  name: string;
  location: string;
  description?: string;
  size?: Size;
  className?: string;
}

const NAME_CLS: Record<Size, string> = {
  sm: 'font-serif font-semibold text-navy-900 line-clamp-2 leading-snug text-[13px]',
  md: 'font-serif font-semibold text-navy-900 line-clamp-2 leading-snug text-[15px]',
};

const LOCATION_CLS: Record<Size, string> = {
  sm: 'text-gray-500 truncate mt-0.5 text-[11px]',
  md: 'text-gray-500 truncate mt-1 text-[12px]',
};

const DESC_CLS: Record<Size, string> = {
  sm: 'text-gray-600 line-clamp-2 leading-relaxed mt-0.5 text-[11px]',
  md: 'text-gray-600 line-clamp-2 leading-relaxed mt-1 text-[12px]',
};

export default function SiteTextBlock({
  name,
  location,
  description,
  size = 'sm',
  className,
}: SiteTextBlockProps) {
  return (
    <div className={`min-w-0 ${className ?? ''}`}>
      <p className={NAME_CLS[size]}>{name}</p>
      <p className={LOCATION_CLS[size]}>{location}</p>
      {description && <SiteDescription text={description} className={DESC_CLS[size]} />}
    </div>
  );
}
