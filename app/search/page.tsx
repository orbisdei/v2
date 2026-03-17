import Header from '@/components/Header';
import SearchClient from './SearchClient';
import { getAllSites, getAllTags } from '@/lib/data';

export default async function SearchPage() {
  const [allSites, allTags] = await Promise.all([getAllSites(), getAllTags()]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <SearchClient allSites={allSites} allTags={allTags} />
    </div>
  );
}
