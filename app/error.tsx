'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-20 px-4">
      <span className="text-5xl mb-4">✙</span>
      <h1 className="font-serif text-2xl font-bold text-navy-900 mb-2">Something went wrong</h1>
      <p className="text-gray-600 mb-6 text-center max-w-md">
        An unexpected error occurred. Please try again.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-5 py-2.5 bg-navy-900 text-white font-medium rounded-lg hover:bg-navy-800 transition-colors"
        >
          Try again
        </button>
        <Link
          href="/"
          className="px-5 py-2.5 border border-navy-900 text-navy-900 font-medium rounded-lg hover:bg-navy-50 transition-colors"
        >
          Return to map
        </Link>
      </div>
    </div>
  );
}
