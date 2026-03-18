'use client';

import VisitedCircle from './VisitedCircle';
import BookmarkCircle from './BookmarkCircle';

interface SiteRowActionsProps {
  siteId: string;
  siteName: string;
  thumbnailUrl?: string;
}

export default function SiteRowActions({ siteId, siteName, thumbnailUrl }: SiteRowActionsProps) {
  return (
    <div className="flex items-center shrink-0" style={{ gap: '2px' }}>
      <VisitedCircle siteId={siteId} />
      <BookmarkCircle siteId={siteId} siteName={siteName} thumbnailUrl={thumbnailUrl} />
    </div>
  );
}
