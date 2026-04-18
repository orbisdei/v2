interface PendingEditBadgeProps {
  size?: 'sm' | 'md';
}

export default function PendingEditBadge({ size = 'sm' }: PendingEditBadgeProps) {
  const cls = size === 'md' ? 'text-xs text-amber-700 font-medium' : 'text-[11px] text-amber-700 font-medium';
  return <span className={cls}>Pending edit</span>;
}
