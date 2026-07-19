'use client';

import { useEffect, useRef, useState } from 'react';

interface LazyMountProps {
  children: React.ReactNode;
  /** Distance from the viewport at which to mount (IntersectionObserver rootMargin). */
  rootMargin?: string;
  className?: string;
}

/**
 * Defers rendering children until the wrapper nears the viewport.
 *
 * Used around the inline site-detail maps so the Leaflet chunk + OSM tiles
 * don't load (and block the main thread) during initial page load. It also
 * solves the responsive-duplicate problem for free: the mobile and desktop
 * layouts both render their own map wrapped in CSS show/hide, and a
 * display:none element never intersects — so each viewport only ever mounts
 * the one map it actually shows, instead of Leaflet initializing for the
 * hidden layout too.
 */
export default function LazyMount({ children, rootMargin = '500px', className }: LazyMountProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (mounted || !ref.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setMounted(true);
      },
      { rootMargin }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [mounted, rootMargin]);

  return (
    <div ref={ref} className={className ?? 'w-full h-full'}>
      {mounted ? children : null}
    </div>
  );
}
