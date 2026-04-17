import Header from '@/components/Header';

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-5xl mx-auto px-4 py-6 animate-pulse">
        <div className="h-5 w-24 bg-gray-200 rounded mb-4" />
        <div className="aspect-[4/3] sm:aspect-[16/9] w-full bg-gray-200 rounded-xl mb-6" />
        <div className="h-8 w-3/4 bg-gray-200 rounded mb-3" />
        <div className="h-4 w-1/2 bg-gray-200 rounded mb-6" />
        <div className="space-y-2 mb-8">
          <div className="h-4 w-full bg-gray-200 rounded" />
          <div className="h-4 w-full bg-gray-200 rounded" />
          <div className="h-4 w-2/3 bg-gray-200 rounded" />
        </div>
        <div className="h-64 w-full bg-gray-200 rounded-xl mb-8" />
        <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-square bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
