import { formatRichText } from '@/lib/richText';

interface SiteDescriptionProps {
  text: string | null | undefined;
  className?: string;
}

export default function SiteDescription({ text, className }: SiteDescriptionProps) {
  if (!text) return null;
  return <div className={className}>{formatRichText(text)}</div>;
}
