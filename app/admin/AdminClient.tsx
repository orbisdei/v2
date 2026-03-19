'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle, XCircle, User, ChevronDown, Sparkles } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface Submission {
  id: string;
  type: 'site' | 'tag' | 'note';
  action: 'create' | 'edit';
  payload: Record<string, unknown>;
  submitted_by: string;
  submitter_name: string;
  created_at: string;
  status: 'pending';
}

interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

interface AdminClientProps {
  submissions: Submission[];
  users: UserProfile[];
}

const ROLES = ['general', 'contributor', 'administrator'];

const ROLE_COLORS: Record<string, string> = {
  administrator: 'bg-gold-100 text-gold-800',
  contributor: 'bg-blue-100 text-blue-800',
  general: 'bg-gray-100 text-gray-700',
};

export default function AdminClient({ submissions: initial, users: initialUsers }: AdminClientProps) {
  const [submissions, setSubmissions] = useState(initial);
  const [users, setUsers] = useState(initialUsers);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'submissions' | 'users'>('submissions');
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleApprove(sub: Submission) {
    const supabase = createClient();

    // Write the approved payload to the right table
    if (sub.type === 'site' && sub.action === 'create') {
      const p = sub.payload as Record<string, unknown>;
      // Insert site
      const { error: siteError } = await supabase.from('sites').insert({
        id: p.id ?? crypto.randomUUID(),
        name: p.name,
        short_description: p.short_description ?? '',
        latitude: p.latitude,
        longitude: p.longitude,
        google_maps_url: p.google_maps_url ?? '',
        interest: p.interest ?? null,
        featured: false,
        created_by: sub.submitted_by,
        updated_at: new Date().toISOString(),
      });
      if (siteError) { showToast('Error: ' + siteError.message); return; }

      // Insert tag assignments
      if (Array.isArray(p.tag_ids)) {
        const siteId = (p.id ?? '') as string;
        await supabase.from('site_tag_assignments').insert(
          (p.tag_ids as string[]).map((tag_id) => ({ site_id: siteId, tag_id }))
        );
      }

      // Insert links
      if (Array.isArray(p.links)) {
        const siteId = (p.id ?? '') as string;
        await supabase.from('site_links').insert(
          (p.links as { url: string; link_type: string; comment?: string }[]).map((l) => ({
            site_id: siteId,
            url: l.url,
            link_type: l.link_type,
            comment: l.comment ?? null,
          }))
        );
      }

      // Insert contributor note if present
      if (p.contributor_note) {
        await supabase.from('site_contributor_notes').insert({
          site_id: (p.id ?? '') as string,
          note: p.contributor_note as string,
          created_by: sub.submitted_by,
        });
      }
    } else if (sub.type === 'tag' && sub.action === 'create') {
      const p = sub.payload;
      const { error } = await supabase.from('tags').insert({
        id: p.id,
        name: p.name,
        description: p.description ?? '',
        featured: false,
        created_by: sub.submitted_by,
      });
      if (error) { showToast('Error: ' + error.message); return; }
    }

    // Mark submission as approved
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('pending_submissions').update({
      status: 'approved',
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', sub.id);

    setSubmissions((s) => s.filter((x) => x.id !== sub.id));
    showToast('Approved ✓');
  }

  async function handleReject(sub: Submission) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('pending_submissions').update({
      status: 'rejected',
      reviewed_by: user?.id,
      review_notes: reviewNotes[sub.id] ?? null,
      reviewed_at: new Date().toISOString(),
    }).eq('id', sub.id);

    setSubmissions((s) => s.filter((x) => x.id !== sub.id));
    showToast('Rejected');
  }

  async function handleRoleChange(userId: string, newRole: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);
    if (error) { showToast('Error: ' + error.message); return; }
    setUsers((u) => u.map((x) => x.id === userId ? { ...x, role: newRole } : x));
    showToast('Role updated');
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-bold text-navy-900">Admin Dashboard</h1>
        <Link
          href="/admin/import"
          className="inline-flex items-center gap-1.5 bg-navy-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-navy-700 transition-colors"
        >
          <Sparkles size={14} />
          Import sites with AI
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(['submissions', 'users'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-navy-900 text-navy-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'submissions' ? `Pending (${submissions.length})` : 'Users'}
          </button>
        ))}
      </div>

      {/* Pending submissions */}
      {activeTab === 'submissions' && (
        <div className="flex flex-col gap-4">
          {submissions.length === 0 && (
            <p className="text-sm text-gray-500 py-8 text-center">No pending submissions.</p>
          )}
          {submissions.map((sub) => (
            <div key={sub.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <span className={`inline-block text-xs font-semibold uppercase px-2 py-0.5 rounded mr-2 ${
                    sub.type === 'site' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {sub.type}
                  </span>
                  <span className="text-xs text-gray-500 uppercase font-medium">{sub.action}</span>
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                    <User size={12} />
                    {sub.submitter_name} · {new Date(sub.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Payload preview */}
              <div className="bg-gray-50 rounded-lg p-3 mb-3 text-xs font-mono text-gray-700 max-h-48 overflow-y-auto">
                <pre className="whitespace-pre-wrap break-words">
                  {JSON.stringify(sub.payload, null, 2)}
                </pre>
              </div>

              {/* Review notes */}
              <textarea
                value={reviewNotes[sub.id] ?? ''}
                onChange={(e) => setReviewNotes((n) => ({ ...n, [sub.id]: e.target.value }))}
                rows={2}
                placeholder="Optional rejection reason…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-300 mb-3"
              />

              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(sub)}
                  className="inline-flex items-center gap-1.5 bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                >
                  <CheckCircle size={15} />
                  Approve
                </button>
                <button
                  onClick={() => handleReject(sub)}
                  className="inline-flex items-center gap-1.5 bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                >
                  <XCircle size={15} />
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Users */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="w-7 h-7 rounded-full" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
                          <User size={14} className="text-gray-500" />
                        </div>
                      )}
                      <span className="font-medium text-navy-900">{u.display_name ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded uppercase ${ROLE_COLORS[u.role] ?? 'bg-gray-100 text-gray-700'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative inline-block">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="appearance-none border border-gray-200 rounded px-3 py-1 text-xs pr-6 focus:outline-none focus:ring-2 focus:ring-navy-300"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                      <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-navy-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
