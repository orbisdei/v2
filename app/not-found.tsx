import Link from 'next/link';
import Header from '@/components/Header';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <span className="text-5xl mb-4">✙</span>
        <h1 className="font-serif text-2xl font-bold text-navy-900 mb-2">
          Page Not Found
        </h1>
        <p className="text-gray-600 mb-6 text-center max-w-md">
          The page you&apos;re looking for doesn&apos;t exist. It may have been moved or the URL
          might be incorrect.
        </p>
        <Link
          href="/"
          className="px-5 py-2.5 bg-navy-900 text-white font-medium rounded-lg hover:bg-navy-800 transition-colors"
        >
          Return to map
        </Link>
      </div>
    </div>
  );
}
