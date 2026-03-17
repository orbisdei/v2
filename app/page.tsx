import Header from '@/components/Header';
import HomePageClient from './HomePageClient';
import { getAllSites, getAllTags, getFeaturedSites, getMapPins } from '@/lib/data';

export default async function HomePage() {
  const [allSites, allTags, featuredSites, mapPins] = await Promise.all([
    getAllSites(),
    getAllTags(),
    getFeaturedSites(),
    getMapPins(),
  ]);

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <HomePageClient
        allSites={allSites}
        allTags={allTags}
        featuredSites={featuredSites}
        mapPins={mapPins}
      />
    </div>
  );
}
