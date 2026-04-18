import Link from 'next/link';
import type { ReactNode } from 'react';

type Variant = 'location' | 'topic';
type Size = 'sm' | 'md';

interface TagPillProps {
  href: string;
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
}

const BASE =
  'inline-flex items-center shrink-0 whitespace-nowrap rounded-full font-medium transition-colors border';

const VARIANT_CLS: Record<Variant, string> = {
  location: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
  topic: 'bg-white text-navy-700 border-navy-200 hover:bg-navy-50',
};

const SIZE_CLS: Record<Size, string> = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-1 text-xs',
};

export default function TagPill({
  href,
  variant = 'topic',
  size = 'md',
  children,
  className,
}: TagPillProps) {
  const cls = [BASE, VARIANT_CLS[variant], SIZE_CLS[size], className ?? ''].join(' ');
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}
