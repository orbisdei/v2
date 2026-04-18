import SiteDescription from './SiteDescription';

interface SiteTextBlockProps {
  name: string;
  location: string;
  description?: string;
  className?: string;
}

export default function SiteTextBlock({ name, location, description, className }: SiteTextBlockProps) {
  return (
    <div className={`min-w-0 ${className ?? ''}`}>
      <p className="font-serif text-[13px] font-semibold text-navy-900 line-clamp-2 leading-snug">
        {name}
      </p>
      <p className="text-[11px] text-gray-500 truncate mt-0.5">{location}</p>
      {description && (
        <SiteDescription
          text={description}
          className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed mt-0.5"
        />
      )}
    </div>
  );
}
