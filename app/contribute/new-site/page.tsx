'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send } from 'lucide-react';
import Header from '@/components/Header';
import { createClient } from '@/utils/supabase/client';
import { generateSiteId } from '@/lib/utils';
import {
  SiteForm,
  SiteFormValues,
  EMPTY_SITE_FORM,
  LinkEntry,
  ImageEntry,
  buildImagesPayload,
} from '@/components/admin/SiteForm';
import type { Tag } from '@/lib/types';

export default function NewSitePage() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [links, setLinks] = useState<LinkEntry[]>([
    { id: crypto.randomUUID(), url: '', link_type: 'Official Website', comment: '' },
  ]);
  const [contributorNote, setContributorNote] = useState('');
  const [values, setValues] = useState<SiteFormValues>(EMPTY_SITE_FORM);
  const [allTags, setAllTags] = useState<Tag[]>([]);

  // Images — managed by SiteForm; we read from ref on submit
  const latestImages = useRef<ImageEntry[]>([]);
  const [anyUploading, setAnyUploading] = useState(false);

  function handleImagesChange(imgs: ImageEntry[], uploading: boolean) {
    latestImages.current = imgs;
    setAnyUploading(uploading);
  }

  useEffect(() => {
    createClient()
      .from('tags')
      .select('*')
      .order('name')
      .then(({ data }) => { if (data) setAllTags(data); });
  }, []);

  function handleChange(field: keyof SiteFormValues, value: string | string[]) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function handleTagCreated(tag: Tag) {
    setAllTags((prev) => [...prev, tag]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (anyUploading) return;
    setStatus('submitting');
    setErrorMsg('');

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setStatus('error'); setErrorMsg('You must be logged in.'); return; }

    const generatedId = generateSiteId(values.country, values.municipality, values.name);

    const payload = {
      name: values.name,
      native_name: values.native_name || null,
      country: values.country.toUpperCase() || null,
      region: values.region || null,
      municipality: values.municipality || null,
      generated_id: generatedId || null,
      short_description: values.short_description,
      latitude: parseFloat(values.latitude),
      longitude: parseFloat(values.longitude),
      google_maps_url: values.google_maps_url,
      interest: values.interest || null,
      tag_ids: values.tag_ids,
      links: links
        .filter((l) => l.url.trim())
        .map((l) => ({ url: l.url, link_type: l.link_type, comment: l.comment || null })),
      images: buildImagesPayload(latestImages.current),
      contributor_note: contributorNote,
    };

    const { error } = await supabase.from('pending_submissions').insert({
      type: 'site',
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

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <div className="text-4xl mb-4">✝</div>
          <h1 className="font-serif text-2xl font-bold text-navy-900 mb-3">Submission received</h1>
          <p className="text-gray-600 mb-6">
            Thank you. Your site submission is pending review by an administrator.
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
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-navy-700 hover:text-navy-500 font-medium mb-6">
          <ArrowLeft size={16} />
          Back to map
        </Link>

        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="font-serif text-2xl font-bold text-navy-900 mb-1">Submit a holy site</h1>
            <p className="text-sm text-gray-500">
              Your submission will be reviewed by an administrator before it appears on the map.
            </p>
          </div>
          <Link
            href="/admin/import"
            className="shrink-0 text-xs text-navy-700 hover:text-navy-500 font-medium whitespace-nowrap flex items-center gap-1"
          >
            Import multiple with AI →
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 bg-white rounded-xl border border-gray-200 p-6">
          <SiteForm
            values={values}
            onChange={handleChange}
            allTags={allTags}
            onTagCreated={handleTagCreated}
            links={links}
            onLinksChange={setLinks}
            showPhotoUpload
            onImagesChange={handleImagesChange}
          />

          {/* Contributor note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contributor note
            </label>
            <textarea
              value={contributorNote}
              onChange={(e) => setContributorNote(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300 resize-none"
              placeholder="Internal notes for the admin reviewer (not shown publicly)…"
            />
          </div>

          {status === 'error' && (
            <p className="text-sm text-red-600">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={status === 'submitting' || anyUploading}
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
