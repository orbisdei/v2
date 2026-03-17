import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { getAllTags, getTagBySlug, getSitesByTag, getCreatorName } from '@/lib/data';
import Header from '@/components/Header';
import MapViewDynamic from '@/components/MapViewDynamic';
import type { Metadata } from 'next';
import type { MapPin } from '@/lib/types';

export async function generateStaticParams() {
  const tags = await getAllTags();
  return tags.map((t) => ({ slug: t.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tag = await getTagBySlug(slug);
  if (!tag) return { title: 'Tag Not Found — Orbis Dei' };
  return {
    title: `${tag.name} — Orbis Dei`,
    description: tag.description,
  };
}

export default async function TagPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tag = await getTagBySlug(slug);
  if (!tag) notFound();

  const sites = await getSitesByTag(tag.id);
  const creatorName = tag.created_by ? await getCreatorName(tag.created_by) : null;

  const pins: MapPin[] = sites.map((s) => ({
    id: s.id,
    name: s.name,
    latitude: s.latitude,
    longitude: s.longitude,
    short_description: s.short_description,
    thumbnail_url: s.images[0]?.url,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-56px)]">
        {/* Left: Tag info + site list */}
        <div className="lg:w-1/2 xl:w-[45%] overflow-y-auto">
          {/* Hero */}
          {tag.image_url && (
            <div className="relative h-48 md:h-56 bg-gray-200 overflow-hidden">
              <div className="absolute inset-0 bg-navy-900/40" />
              <div className="absolute top-4 left-4">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1 text-sm text-white/90 hover:text-white font-medium"
                >
                  <ArrowLeft size={16} />
                  Back to search
                </Link>
              </div>
            </div>
          )}

          <div className="px-4 md:px-6 py-5">
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-navy-900">
              {tag.name}
            </h1>
            <p className="mt-3 text-gray-700 leading-relaxed">
              {tag.description}
            </p>

            {/* Creator attribution */}
            {creatorName && (
              <p className="mt-2 text-xs text-gray-400">Tag added by {creatorName}</p>
            )}

            {/* Site count + list */}
            <div className="mt-6 flex items-center justify-between">
              <span className="text-sm font-semibold text-navy-900">
                {sites.length} {sites.length === 1 ? 'Result' : 'Results'}
              </span>
            </div>

            <div className="mt-3 flex flex-col gap-1">
              {sites.map((site, idx) => (
                <Link
                  key={site.id}
                  href={`/site/${site.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white hover:shadow-sm transition-all group border border-transparent hover:border-gray-200"
                >
                  <span className="text-sm font-medium text-gray-400 w-5 shrink-0">
                    {idx + 1}
                  </span>
                  {site.images[0] && (
                    <img
                      src={site.images[0].url}
                      alt={site.name}
                      className="w-14 h-14 object-cover rounded-md shrink-0"
                      loading="lazy"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-navy-900 truncate group-hover:text-navy-600">
                      {site.name}
                    </h4>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                      {site.short_description}
                    </p>
                    {site.featured && (
                      <span className="text-[10px] text-gold-700 bg-gold-50 px-1.5 py-0.5 rounded font-medium mt-1 inline-block">
                        featured
                      </span>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Map */}
        <div className="hidden lg:block lg:w-1/2 xl:w-[55%] sticky top-0 h-[calc(100vh-56px)]">
          <MapViewDynamic pins={pins} initialFitBounds />
        </div>
      </div>
    </div>
  );
}
