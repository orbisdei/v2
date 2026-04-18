'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { formatRichText } from '@/lib/richText';
import type { ContributorNote } from '@/lib/types';

type Size = 'sm' | 'md';

interface ContributorNotesSectionProps {
  siteId: string;
  initialNotes: ContributorNote[];
  userId?: string | null;
  userRole?: string | null;
  userInitialsDisplay?: string | null;
  size?: Size;
  className?: string;
}

const STYLES = {
  sm: {
    heading: 'text-[10px] uppercase tracking-[0.5px] font-medium text-gray-400 mb-1',
    list: 'flex flex-col gap-y-1',
    li: 'flex items-start gap-2 text-[12px] text-gray-600 leading-relaxed py-[2px]',
    initials: 'ml-1.5 text-[11px] text-gray-400',
    trashSize: 13,
    addBtn: 'text-[11px] text-navy-700 font-medium hover:text-navy-500',
    textarea: 'w-full border border-gray-200 rounded-lg px-3 py-2 text-[12px] resize-none focus:outline-none focus:ring-2 focus:ring-navy-300',
    counter: 'text-[11px] text-gray-400',
    cancelBtn: 'text-[11px] text-gray-500 hover:text-gray-700',
    submitBtn: 'text-[11px] bg-navy-900 text-white px-3 py-1 rounded-lg hover:bg-navy-700 disabled:opacity-50',
    confirm: 'text-[11px] text-green-700 mt-1',
  },
  md: {
    heading: 'text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2',
    list: 'flex flex-col gap-1.5',
    li: 'flex items-start gap-2 text-sm text-gray-600 leading-relaxed',
    initials: 'ml-1.5 text-xs text-gray-400',
    trashSize: 14,
    addBtn: 'text-xs text-navy-700 font-medium hover:text-navy-500',
    textarea: 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-300',
    counter: 'text-xs text-gray-400',
    cancelBtn: 'text-xs text-gray-500 hover:text-gray-700',
    submitBtn: 'text-xs bg-navy-900 text-white px-3 py-1.5 rounded-lg hover:bg-navy-700 disabled:opacity-50',
    confirm: 'text-xs text-green-700 mt-1',
  },
} as const;

export default function ContributorNotesSection({
  siteId,
  initialNotes,
  userId,
  userRole,
  userInitialsDisplay,
  size = 'md',
  className,
}: ContributorNotesSectionProps) {
  const canAddNote = userRole === 'contributor' || userRole === 'administrator';
  const [notes, setNotes] = useState<ContributorNote[]>(initialNotes);
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);

  const s = STYLES[size];

  async function handleSubmit() {
    if (!noteText.trim() || noteSubmitting) return;
    setNoteSubmitting(true);
    const supabase = createClient();

    if (userRole === 'administrator') {
      const { data, error } = await supabase
        .from('site_contributor_notes')
        .insert({ site_id: siteId, note: noteText.trim(), created_by: userId })
        .select('id, created_at')
        .single();
      if (!error && data) {
        setNotes((prev) => [
          ...prev,
          {
            id: data.id,
            site_id: siteId,
            note: noteText.trim(),
            created_by: userId ?? undefined,
            created_at: data.created_at,
            author_initials_display: userInitialsDisplay ?? undefined,
          },
        ]);
      }
    } else {
      await supabase.from('pending_submissions').insert({
        type: 'note',
        action: 'create',
        payload: { site_id: siteId, note: noteText.trim() },
        submitted_by: userId,
        status: 'pending',
      });
      setConfirmMsg('Your note has been submitted for review.');
      setTimeout(() => setConfirmMsg(null), 5000);
    }

    setNoteText('');
    setShowAddNote(false);
    setNoteSubmitting(false);
  }

  async function handleDelete(noteId: string) {
    if (!window.confirm('Remove this note?')) return;
    const supabase = createClient();
    await supabase.from('site_contributor_notes').delete().eq('id', noteId);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  }

  if (notes.length === 0 && !canAddNote) return null;

  return (
    <div className={className}>
      <h3 className={s.heading}>Contributor Notes</h3>
      {notes.length > 0 && (
        <ul className={s.list}>
          {notes.map((note) => (
            <li key={note.id} className={s.li}>
              <span className="flex-1">
                {formatRichText(note.note)}
                {note.author_initials_display && (
                  <span className={s.initials}>— {note.author_initials_display}</span>
                )}
              </span>
              {(note.created_by === userId || userRole === 'administrator') && (
                <button
                  type="button"
                  onClick={() => handleDelete(note.id)}
                  className="shrink-0 text-gray-300 hover:text-red-500 transition-colors mt-0.5"
                  aria-label="Remove note"
                >
                  <Trash2 size={s.trashSize} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canAddNote && (
        <div className="mt-2">
          {!showAddNote ? (
            <button type="button" onClick={() => setShowAddNote(true)} className={s.addBtn}>
              + Add a note
            </button>
          ) : (
            <div>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value.slice(0, 500))}
                rows={3}
                placeholder="Share your experience or practical tips about this site…"
                className={s.textarea}
              />
              <div className="flex items-center justify-between mt-1">
                <span className={s.counter}>{noteText.length}/500</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowAddNote(false); setNoteText(''); }}
                    className={s.cancelBtn}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!noteText.trim() || noteSubmitting}
                    className={s.submitBtn}
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
          )}
          {confirmMsg && <p className={s.confirm}>{confirmMsg}</p>}
        </div>
      )}
    </div>
  );
}
