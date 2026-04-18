import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode, MouseEventHandler } from 'react';

type Size = 'sm' | 'md';
type Variant = 'dark' | 'light';

interface BaseProps {
  children: ReactNode;
  size?: Size;
  variant?: Variant;
  className?: string;
}

type BackLinkProps =
  | (BaseProps & { href: string; onClick?: never })
  | (BaseProps & { href?: never; onClick: MouseEventHandler<HTMLButtonElement> });

const ICON_SIZE: Record<Size, number> = { sm: 14, md: 16 };

const TEXT_CLS: Record<Size, string> = {
  sm: 'text-[13px]',
  md: 'text-sm',
};

const VARIANT_CLS: Record<Variant, string> = {
  dark: 'text-navy-700 font-medium hover:text-navy-500',
  light: 'text-white font-medium drop-shadow',
};

export default function BackLink(props: BackLinkProps) {
  const { children, size = 'sm', variant = 'dark', className } = props;
  const cls = [
    'inline-flex items-center gap-1',
    TEXT_CLS[size],
    VARIANT_CLS[variant],
    className ?? '',
  ].join(' ');
  const content = (
    <>
      <ArrowLeft size={ICON_SIZE[size]} />
      {children}
    </>
  );
  if ('href' in props && props.href) {
    return (
      <Link href={props.href} className={cls}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={props.onClick} className={cls}>
      {content}
    </button>
  );
}
