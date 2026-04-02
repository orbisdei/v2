'use client';

import { useState } from 'react';
import Link from 'next/link';
import InterestFilter from '@/components/InterestFilter';
import { PUBLIC_LEVELS, type InterestLevel } from '@/lib/interestFilter';

interface SettingsClientProps {
  settings: Record<string, unknown>;
}

export default function SettingsClient({ settings }: SettingsClientProps) {
  const [homepageLevels, setHomepageLevels] = useState<Set<InterestLevel>>(() => {
    const val = settings.homepage_default_levels;
    if (Array.isArray(val)) return new Set(val as InterestLevel[]);
    return new Set(['global', 'regional'] as InterestLevel[]);
  });

  const [highThreshold, setHighThreshold] = useState<number>(() => {
    const val = settings.location_tag_high_threshold;
    return typeof val === 'number' ? val : 25;
  });

  const [lowThreshold, setLowThreshold] = useState<number>(() => {
    const val = settings.location_tag_low_threshold;
    return typeof val === 'number' ? val : 10;
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    const updates: { key: string; value: unknown }[] = [
      { key: 'homepage_default_levels', value: Array.from(homepageLevels) },
      { key: 'location_tag_high_threshold', value: highThreshold },
      { key: 'location_tag_low_threshold', value: lowThreshold },
    ];

    try {
      for (const update of updates) {
        const res = await fetch('/api/update-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(update),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? 'Failed to save settings');
        }
      }
      showToast('Settings saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/admin"
          className="text-sm text-navy-700 hover:text-navy-900 transition-colors"
        >
          ← Back to dashboard
        </Link>
        <h1 className="font-serif text-2xl font-bold text-navy-900 mt-2">Site Settings</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-navy-900 mb-5">Interest Level Filtering</h2>

        {/* Section 1: Homepage Default Filter */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-1">Homepage Default Filter</p>
          <p className="text-xs text-gray-500 mb-3">
            Which interest levels are shown by default on the homepage map
          </p>
          <InterestFilter
            activeLevels={homepageLevels}
            onChange={setHomepageLevels}
            availableLevels={PUBLIC_LEVELS}
          />
        </div>

        {/* Section 2: Location Tag Thresholds */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-1">Location Tag Thresholds</p>
          <div className="flex flex-col gap-4 mt-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                High threshold
              </label>
              <p className="text-xs text-gray-400 mb-2">
                Show only Global sites when a location tag has this many or more global-interest sites
              </p>
              <input
                type="number"
                min={1}
                step={1}
                value={highThreshold}
                onChange={(e) => setHighThreshold(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Low threshold
              </label>
              <p className="text-xs text-gray-400 mb-2">
                Show Global + Regional when a location tag has this many or more combined global+regional sites
              </p>
              <input
                type="number"
                min={1}
                step={1}
                value={lowThreshold}
                onChange={(e) => setLowThreshold(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 mb-4">{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-navy-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-navy-700 disabled:opacity-60 transition-colors"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-navy-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
