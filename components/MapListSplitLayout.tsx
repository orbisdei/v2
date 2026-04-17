import type { ReactNode } from 'react';

interface MapListSplitLayoutProps {
  left: ReactNode;
  map: ReactNode;
}

export default function MapListSplitLayout({ left, map }: MapListSplitLayoutProps) {
  return (
    <div className="flex flex-col lg:flex-row">
      <div className="w-full lg:w-1/2 xl:w-[45%] lg:h-[calc(100dvh-56px)] lg:overflow-y-auto">
        {left}
      </div>
      <div className="hidden lg:block lg:w-1/2 xl:w-[55%] sticky top-0 h-[calc(100dvh-56px)] relative">
        {map}
      </div>
    </div>
  );
}
