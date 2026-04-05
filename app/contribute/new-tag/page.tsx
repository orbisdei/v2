'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send } from 'lucide-react';
import Header from '@/components/Header';
import { createClient } from '@/utils/supabase/client';
import ImageUploader from '@/components/admin/ImageUploader';

const MAX_DEDICATION = 280;

function toTagSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export default function NewTagPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageAttribution, setImageAttribution] = useState('');
  const [dedication, setDedication] = useState('');
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const generatedId = toTagSlug(name);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!generatedId) { setStatus('error'); setErrorMsg('Tag name is required.'); return; }

    setStatus('submitting');
    setErrorMsg('');

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setStatus('error'); setErrorMsg('You must be logged in.'); return; }

    const payload: Record<string, unknown> = {
      id: generatedId,
      name,
      description,
    };
    if (imageUrl) payload.image_url = imageUrl;
    if (imageAttribution) payload.image_attribution = imageAttribution;
    if (dedication.trim()) payload.dedication = dedication.trim();

    const { error } = await supabase.from('pending_submissions').insert({
      type: 'tag',
      action: 'create',
      payload,
      submitted_by: user.id,
    });

    if (error) {
      setStatus('error');
      setErrorMsg(error.message);
    } else {
      setStatus('success');
    }
  }

  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';
  const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300';

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <div className="text-4xl mb-4">✝</div>
          <h1 className="font-serif text-2xl font-bold text-navy-900 mb-3">Submission received</h1>
          <p className="text-gray-600 mb-6">
            Thank you. Your tag submission is pending review by an administrator.
          </p>
          <Link href="/" className="text-sm text-navy-700 hover:text-navy-500 font-medium">
            ← Back to map
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-xl mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-navy-700 hover:text-navy-500 font-medium mb-6">
          <ArrowLeft size={16} />
          Back to map
        </Link>

        <h1 className="font-serif text-2xl font-bold text-navy-900 mb-1">Submit a new tag</h1>
        <p className="text-sm text-gray-500 mb-6">
          Tags help categorize sites by holy person, location, or theme. Your submission will be reviewed before it goes live.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 bg-white rounded-xl border border-gray-200 p-6">

          {/* Name */}
          <div>
            <label className={labelClass}>
              Display name <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="e.g. Our Lady of Fatima"
            />
            {generatedId && (
              <p className="text-xs text-gray-400 mt-1">
                ID: <span className="font-mono">{generatedId}</span>
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={`${inputClass} resize-none`}
              placeholder="Who or what this tag represents…"
            />
          </div>

          {/* Image */}
          <div>
            <label className={labelClass}>Image</label>
            <ImageUploader
              mode="tag"
              entityId={generatedId || null}
              onImagesChange={(imgs, anyUploading) => {
                setUploading(anyUploading);
                const activeImg = imgs.find((i) => !i.removed);
                setImageUrl(activeImg?.finalUrl ?? activeImg?.previewUrl ?? '');
                setImageAttribution(activeImg?.attribution ?? '');
              }}
              searchName={name}
            />
          </div>

          {/* Dedication */}
          <div>
            <label className={labelClass}>Personal dedication (optional)</label>
            <p className="text-xs text-gray-400 mb-1">
              A short personal note about why you created this tag. This will be displayed publicly.
            </p>
            <textarea
              value={dedication}
              onChange={(e) => setDedication(e.target.value.slice(0, MAX_DEDICATION))}
              rows={3}
              maxLength={MAX_DEDICATION}
              placeholder="A personal dedication or note about this tag…"
              className={`${inputClass} resize-none`}
            />
            <p className="text-xs text-gray-400 mt-1 text-right">
              {dedication.length}/{MAX_DEDICATION}
            </p>
          </div>

          {status === 'error' && (
            <p className="text-sm text-red-600">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={status === 'submitting' || uploading}
            className="inline-flex items-center justify-center gap-2 bg-navy-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-navy-700 transition-colors disabled:opacity-50"
          >
            <Send size={16} />
            {status === 'submitting' ? 'Submitting…' : 'Submit for review'}
          </button>
        </form>
      </div>
    </div>
  );
}
