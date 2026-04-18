import Link from 'next/link';
import { Pencil } from 'lucide-react';
import type { ReactNode } from 'react';

type Size = 'sm' | 'md';

interface EditLinkProps {
  href: string;
  children: ReactNode;
  size?: Size;
  className?: string;
}

const ICON_SIZE: Record<Size, number> = { sm: 13, md: 14 };
const TEXT_CLS: Record<Size, string> = { sm: 'text-[13px]', md: 'text-sm' };

export default function EditLink({ href, children, size = 'sm', className }: EditLinkProps) {
  const cls = [
    'inline-flex items-center gap-1 font-medium text-navy-700 hover:text-navy-500',
    TEXT_CLS[size],
    className ?? '',
  ].join(' ');
  return (
    <Link href={href} className={cls}>
      <Pencil size={ICON_SIZE[size]} />
      {children}
    </Link>
  );
}
