interface UserAvatarProps {
  avatarUrl?: string | null;
  initials: string;
  size?: number;
  className?: string;
}

export default function UserAvatar({ avatarUrl, initials, size = 28, className }: UserAvatarProps) {
  const style = { width: size, height: size } as const;
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className={`rounded-full object-cover shrink-0 ${className ?? ''}`}
        style={style}
      />
    );
  }
  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-semibold shrink-0 ${className ?? ''}`}
      style={{ ...style, background: '#1e1e5f', fontSize: Math.max(10, Math.round(size * 0.4)) }}
    >
      {initials}
    </div>
  );
}
