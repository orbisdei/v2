import Header from '@/components/Header';

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex flex-col lg:flex-row animate-pulse">
        <div className="w-full lg:w-1/2 xl:w-[45%] px-4 py-6 lg:px-8">
          <div className="h-5 w-28 bg-gray-200 rounded mb-4" />
          <div className="h-8 w-3/4 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-1/2 bg-gray-200 rounded mb-6" />
          <div className="h-5 w-20 bg-gray-200 rounded mb-3" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-16 h-16 bg-gray-200 rounded-lg shrink-0" />
                <div className="flex-1 min-w-0 space-y-2 pt-1">
                  <div className="h-4 w-3/4 bg-gray-200 rounded" />
                  <div className="h-3 w-1/2 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="hidden lg:block lg:w-1/2 xl:w-[55%] bg-gray-200 min-h-[calc(100vh-64px)]" />
      </div>
    </div>
  );
}
