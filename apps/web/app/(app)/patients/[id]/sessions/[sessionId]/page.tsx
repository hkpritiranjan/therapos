'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronRight,
  Pencil,
  Sparkles,
  Lock,
  Play,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { clsx } from 'clsx';
import {
  useSession,
  usePatient,
  useSessionNote,
  startSession,
  completeSession,
  updateSession,
  createNote,
  updateNote,
  finalizeNote,
  streamNoteDraft,
} from '@/lib/api';
import type { NoteFormat, Session, SessionNote } from '@/lib/api';
import { parseDraft, formatStreamPreview } from '@/lib/draft-parser';
import type { DraftFields } from '@/lib/draft-parser';

// ── Types ─────────────────────────────────────────────────────────────────────

const EMPTY_DRAFT: DraftFields = {
  subjective: '',
  objective: '',
  assessment: '',
  plan: '',
  data: '',
  dapAssessment: '',
  dapPlan: '',
  behavior: '',
  intervention: '',
  birpResponse: '',
  birpPlan: '',
  freeText: '',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ── Status badge ──────────────────────────────────────────────────────────────

function SessionStatusBadge({ status }: { status: Session['status'] }) {
  const config: Record<Session['status'], { label: string; color: string; bg: string }> = {
    SCHEDULED: { label: 'Scheduled', color: '#3B55C9', bg: 'rgba(59,130,246,0.15)' },
    IN_PROGRESS: { label: 'In Progress', color: '#8A5A00', bg: 'rgba(245,158,11,0.15)' },
    COMPLETED: { label: 'Completed', color: '#1F7A5A', bg: 'rgba(16,185,129,0.15)' },
    CANCELLED: { label: 'Cancelled', color: '#B8324D', bg: 'rgba(239,68,68,0.1)' },
    NO_SHOW: { label: 'No Show', color: 'var(--text-mid)', bg: 'rgba(148,163,184,0.1)' },
  };
  const c = config[status] ?? config.SCHEDULED;
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: c.bg, color: c.color }}
    >
      {c.label}
    </span>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx('animate-pulse rounded-lg', className)}
      style={{ backgroundColor: 'var(--bg-elevated)' }}
    />
  );
}

// ── Textarea field ────────────────────────────────────────────────────────────

function DraftTextarea({
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const count = wordCount(value);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {label}
        </label>
        {value && (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {count} {count === 1 ? 'word' : 'words'}
          </span>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder ?? `${label}…`}
        rows={4}
        style={{
          width: '100%',
          padding: '0.625rem 0.75rem',
          borderRadius: '0.5rem',
          border: '1px solid var(--border)',
          backgroundColor: disabled ? 'var(--bg-base)' : 'var(--bg-elevated)',
          color: disabled ? 'var(--text-mid)' : 'var(--text-primary)',
          fontSize: '0.875rem',
          resize: 'vertical',
          outline: 'none',
          lineHeight: '1.6',
          minHeight: '6rem',
          cursor: disabled ? 'not-allowed' : 'text',
          opacity: disabled ? 0.75 : 1,
        }}
      />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SessionWorkspacePage() {
  const params = useParams<{ id: string; sessionId: string }>();
  const patientId = params.id;
  const sessionId = params.sessionId;

  // ── Data fetching ──────────────────────────────────────────────────────────
  const {
    data: sessionResp,
    isLoading: sessionLoading,
    error: sessionError,
    mutate: mutateSession,
  } = useSession(sessionId);

  const { data: patientResp } = usePatient(patientId);

  const {
    data: noteResp,
    error: noteError,
    mutate: mutateNote,
    isLoading: noteLoading,
  } = useSessionNote(sessionId);

  const session = sessionResp?.data;
  const patient = patientResp?.data;
  const noteExists = !!noteResp?.data && !noteError;
  const note: SessionNote | null = noteResp?.data ?? null;

  // ── Local state ────────────────────────────────────────────────────────────
  const [rawNotes, setRawNotes] = useState('');
  const [format, setFormat] = useState<NoteFormat>('SOAP');
  const [draft, setDraft] = useState<DraftFields>(EMPTY_DRAFT);
  const [isFinalized, setIsFinalized] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamDisplay, setStreamDisplay] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isStarting, setIsStarting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<Session['status']>('SCHEDULED');

  const abortRef = useRef<AbortController | null>(null);
  const rawNotesInitialized = useRef(false);
  const draftInitialized = useRef(false);

  // ── Sync session data ──────────────────────────────────────────────────────
  useEffect(() => {
    if (session) {
      setSessionStatus(session.status);
      if (!rawNotesInitialized.current && session.rawNotes) {
        setRawNotes(session.rawNotes);
        rawNotesInitialized.current = true;
      }
    }
  }, [session]);

  // ── Sync note data ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (note && !draftInitialized.current) {
      setFormat(note.format);
      setIsFinalized(note.isFinalized);
      setDraft({
        subjective: note.subjective ?? '',
        objective: note.objective ?? '',
        assessment: note.assessment ?? '',
        plan: note.plan ?? '',
        data: note.data ?? '',
        dapAssessment: note.dapAssessment ?? '',
        dapPlan: note.dapPlan ?? '',
        behavior: note.behavior ?? '',
        intervention: note.intervention ?? '',
        birpResponse: note.birpResponse ?? '',
        birpPlan: note.birpPlan ?? '',
        freeText: note.freeText ?? '',
      });
      draftInitialized.current = true;
    }
  }, [note]);

  // ── Cleanup stream on unmount ──────────────────────────────────────────────
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // ── Auto-save rawNotes every 30s ───────────────────────────────────────────
  const saveRawNotes = useCallback(async (notes: string) => {
    if (!sessionId || isFinalized || !notes.trim()) return;
    setSaveStatus('saving');
    try {
      await updateSession(sessionId, { rawNotes: notes });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    }
  }, [sessionId, isFinalized]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (rawNotes && !isFinalized) {
        void saveRawNotes(rawNotes);
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [rawNotes, isFinalized, saveRawNotes]);

  // ── Save draft to API ──────────────────────────────────────────────────────
  async function saveDraft(fields: Partial<DraftFields> = {}) {
    if (!sessionId || isFinalized) return;
    const payload = { format, ...draft, ...fields };
    try {
      if (noteExists) {
        await updateNote(sessionId, payload);
      } else {
        await createNote(sessionId, payload);
      }
      await mutateNote();
    } catch (err) {
      console.error('Failed to save draft:', err);
    }
  }

  // ── Session actions ────────────────────────────────────────────────────────
  async function handleStartSession() {
    if (!sessionId) return;
    setIsStarting(true);
    try {
      await startSession(sessionId);
      setSessionStatus('IN_PROGRESS');
      await mutateSession();
    } catch (err) {
      console.error('Failed to start session:', err);
    } finally {
      setIsStarting(false);
    }
  }

  async function handleCompleteSession() {
    if (!sessionId) return;
    setIsCompleting(true);
    try {
      await completeSession(sessionId);
      setSessionStatus('COMPLETED');
      await mutateSession();
    } catch (err) {
      console.error('Failed to complete session:', err);
    } finally {
      setIsCompleting(false);
    }
  }

  // ── Generate draft ─────────────────────────────────────────────────────────
  function handleGenerate() {
    if (isStreaming || isFinalized || !sessionId) return;
    abortRef.current?.abort();
    setStreamDisplay('');
    setIsStreaming(true);

    let accumulated = '';

    abortRef.current = streamNoteDraft(
      sessionId,
      format,
      (chunk: string) => {
        accumulated += chunk;
        setStreamDisplay(formatStreamPreview(format, accumulated));
      },
      async () => {
        setIsStreaming(false);
        setStreamDisplay('');
        const parsed = parseDraft(format, accumulated);
        setDraft((prev) => ({ ...prev, ...parsed }));
        await saveDraft(parsed);
        draftInitialized.current = true;
      },
      (err: unknown) => {
        console.error('Stream error:', err);
        setIsStreaming(false);
        if (accumulated) {
          setStreamDisplay('');
          const parsed = parseDraft(format, accumulated);
          setDraft((prev) => ({ ...prev, ...parsed }));
        }
      },
    );
  }

  // ── Finalize ───────────────────────────────────────────────────────────────
  async function handleFinalize() {
    if (!sessionId) return;
    setIsFinalizing(true);
    try {
      // Save latest draft first
      await saveDraft();
      // Then finalize
      await finalizeNote(sessionId);
      setIsFinalized(true);
      setShowFinalizeConfirm(false);
      await mutateNote();
    } catch (err) {
      console.error('Failed to finalize:', err);
    } finally {
      setIsFinalizing(false);
    }
  }

  // ── Format fields config ───────────────────────────────────────────────────
  const formatFields: Record<NoteFormat, Array<{ key: keyof DraftFields; label: string; placeholder?: string }>> = {
    SOAP: [
      { key: 'subjective', label: 'Subjective', placeholder: 'What the patient reported — mood, symptoms, life events…' },
      { key: 'objective', label: 'Objective', placeholder: 'Observed behavior, affect, appearance, mental status…' },
      { key: 'assessment', label: 'Assessment', placeholder: 'Clinical interpretation, diagnosis, risk assessment…' },
      { key: 'plan', label: 'Plan', placeholder: 'Treatment plan, interventions, homework, next session…' },
    ],
    DAP: [
      { key: 'data', label: 'Data', placeholder: 'Subjective + objective observations combined…' },
      { key: 'dapAssessment', label: 'Assessment', placeholder: 'Clinical assessment and interpretation…' },
      { key: 'dapPlan', label: 'Plan', placeholder: 'Treatment plan and next steps…' },
    ],
    BIRP: [
      { key: 'behavior', label: 'Behavior', placeholder: 'Presenting behaviors, reported symptoms…' },
      { key: 'intervention', label: 'Intervention', placeholder: 'Techniques and interventions used…' },
      { key: 'birpResponse', label: 'Response', placeholder: "Patient's response to interventions…" },
      { key: 'birpPlan', label: 'Plan', placeholder: 'Next steps, homework, goals…' },
    ],
    FREE: [
      { key: 'freeText', label: 'Notes', placeholder: 'Free-form session notes…' },
    ],
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (sessionLoading || noteLoading) {
    return (
      <div className="flex h-full flex-col space-y-4">
        <Skeleton className="h-12" />
        <div className="grid flex-1 gap-4 lg:grid-cols-2">
          <Skeleton />
          <Skeleton />
        </div>
      </div>
    );
  }

  if (sessionError || !session) {
    return (
      <div className="flex flex-col items-center py-20">
        <AlertCircle size={32} style={{ color: 'var(--danger)' }} />
        <p className="mt-3 text-sm font-medium" style={{ color: 'var(--danger)' }}>
          {sessionError?.status === 404 ? 'Session not found' : 'Failed to load session'}
        </p>
        <Link
          href={`/patients/${patientId}`}
          className="mt-4 text-sm"
          style={{ color: 'var(--accent)', textDecoration: 'none' }}
        >
          Back to patient
        </Link>
      </div>
    );
  }

  const rawNotesCharCount = rawNotes.length;

  return (
    <>
      {/* ── Finalize confirmation modal ── */}
      {showFinalizeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
            onClick={() => setShowFinalizeConfirm(false)}
          />
          <div
            className="relative w-full max-w-sm rounded-xl border p-6 shadow-2xl"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <div
              className="mb-3 flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(16,185,129,0.15)' }}
            >
              <Lock size={18} style={{ color: 'var(--success)' }} />
            </div>
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              Finalize this note?
            </h3>
            <p className="mt-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
              Once finalized, this note cannot be edited. Make sure all fields are complete and accurate.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowFinalizeConfirm(false)}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-mid)',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleFinalize}
                disabled={isFinalizing}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  backgroundColor: 'var(--success)',
                  color: '#fff',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  border: 'none',
                  cursor: isFinalizing ? 'not-allowed' : 'pointer',
                  opacity: isFinalizing ? 0.7 : 1,
                }}
              >
                {isFinalizing ? 'Finalizing…' : 'Yes, finalize'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex h-full flex-col" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
        {/* ── Top bar ── */}
        <div
          className="flex flex-wrap items-center justify-between gap-3 border-b px-0 pb-4"
          style={{ borderColor: 'var(--border)' }}
        >
          {/* Left: breadcrumb + meta */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
              <Link href="/patients" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
                Patients
              </Link>
              <ChevronRight size={12} />
              <Link
                href={`/patients/${patientId}`}
                style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
              >
                {patient
                  ? `${patient.firstName} ${patient.lastName}`
                  : 'Patient'}
              </Link>
              <ChevronRight size={12} />
              <span style={{ color: 'var(--text-primary)' }}>
                Session #{session.sessionNumber}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {formatDateTime(session.scheduledAt)}
              </span>
              <SessionStatusBadge status={sessionStatus} />
              {isFinalized && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: 'var(--success)' }}
                >
                  <Lock size={10} /> Finalized
                </span>
              )}
            </div>
          </div>

          {/* Right: session actions */}
          <div className="flex items-center gap-2">
            {saveStatus === 'saving' && (
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Saving…</span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-xs" style={{ color: 'var(--success)' }}>Saved</span>
            )}

            {sessionStatus === 'SCHEDULED' && (
              <button
                onClick={handleStartSession}
                disabled={isStarting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.4rem 0.875rem',
                  borderRadius: '0.5rem',
                  backgroundColor: 'var(--success)',
                  color: '#fff',
                  fontWeight: '500',
                  fontSize: '0.8125rem',
                  border: 'none',
                  cursor: isStarting ? 'not-allowed' : 'pointer',
                  opacity: isStarting ? 0.7 : 1,
                }}
              >
                {isStarting ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Play size={13} />
                )}
                {isStarting ? 'Starting…' : 'Start session'}
              </button>
            )}

            {sessionStatus === 'IN_PROGRESS' && (
              <button
                onClick={handleCompleteSession}
                disabled={isCompleting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.4rem 0.875rem',
                  borderRadius: '0.5rem',
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-mid)',
                  fontWeight: '500',
                  fontSize: '0.8125rem',
                  border: '1px solid var(--border)',
                  cursor: isCompleting ? 'not-allowed' : 'pointer',
                  opacity: isCompleting ? 0.7 : 1,
                }}
              >
                {isCompleting ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <CheckCircle size={13} />
                )}
                {isCompleting ? 'Completing…' : 'Complete session'}
              </button>
            )}
          </div>
        </div>

        {/* ── Finalized banner ── */}
        {isFinalized && (
          <div
            className="mt-4 flex items-center gap-2 rounded-lg border px-4 py-2.5"
            style={{
              backgroundColor: 'rgba(16,185,129,0.08)',
              borderColor: 'rgba(16,185,129,0.25)',
            }}
          >
            <Lock size={14} style={{ color: 'var(--success)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--success)' }}>
              This note has been finalized and is locked for editing.
            </p>
          </div>
        )}

        {/* ── Main workspace ── */}
        <div className="mt-4 grid flex-1 gap-4 overflow-hidden lg:grid-cols-2">
          {/* ── LEFT: Raw notes ── */}
          <div
            className="flex flex-col overflow-hidden rounded-xl border"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            {/* Panel header */}
            <div
              className="flex items-center gap-2 border-b px-4 py-3"
              style={{ borderColor: 'var(--border)' }}
            >
              <Pencil size={14} style={{ color: 'var(--accent)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Session Notes
              </span>
              <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
                Raw / unstructured
              </span>
            </div>

            {/* Textarea */}
            <div className="flex flex-1 flex-col p-4">
              <textarea
                value={rawNotes}
                onChange={(e) => setRawNotes(e.target.value)}
                onBlur={() => { void saveRawNotes(rawNotes); }}
                disabled={isFinalized}
                placeholder="Type your session notes here… Everything you observe, what the client says, interventions used, homework discussed. The AI will use these to generate the structured note."
                style={{
                  flex: 1,
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-base)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  resize: 'none',
                  outline: 'none',
                  lineHeight: '1.7',
                  fontFamily: 'inherit',
                  minHeight: '400px',
                  cursor: isFinalized ? 'not-allowed' : 'text',
                  opacity: isFinalized ? 0.7 : 1,
                }}
              />

              {/* Footer */}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {rawNotesCharCount.toLocaleString()} characters
                  {rawNotesCharCount > 0 && ` · ${wordCount(rawNotes)} words`}
                </span>
                {!isFinalized && (
                  <button
                    type="button"
                    onClick={() => { void saveRawNotes(rawNotes); }}
                    className="text-xs hover:underline"
                    style={{ color: 'var(--text-muted)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
                  >
                    Save
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT: AI Draft ── */}
          <div
            className="flex flex-col overflow-hidden rounded-xl border"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            {/* Panel header */}
            <div
              className="flex items-center gap-2 border-b px-4 py-3"
              style={{ borderColor: 'var(--border)' }}
            >
              <Sparkles size={14} style={{ color: 'var(--accent)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                AI Draft
              </span>
              <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
                {isFinalized ? 'Read-only' : 'Editable after generation'}
              </span>
            </div>

            <div className="flex flex-1 flex-col overflow-y-auto p-4 space-y-4">
              {/* Format tabs */}
              <div className="flex gap-1 rounded-lg p-1" style={{ backgroundColor: 'var(--bg-base)' }}>
                {(['SOAP', 'DAP', 'BIRP', 'FREE'] as NoteFormat[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => !isFinalized && setFormat(f)}
                    disabled={isFinalized}
                    style={{
                      flex: 1,
                      padding: '0.3rem 0',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: format === f ? '600' : '400',
                      border: 'none',
                      cursor: isFinalized ? 'not-allowed' : 'pointer',
                      backgroundColor: format === f ? 'var(--bg-elevated)' : 'transparent',
                      color: format === f ? 'var(--text-primary)' : 'var(--text-muted)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Generate button */}
              {!isFinalized && (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isStreaming || !rawNotes.trim()}
                  style={{
                    width: '100%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem',
                    borderRadius: '0.5rem',
                    backgroundColor: isStreaming ? 'var(--accent-hover)' : 'var(--accent)',
                    color: '#fff',
                    fontWeight: '500',
                    fontSize: '0.875rem',
                    border: 'none',
                    cursor: isStreaming || !rawNotes.trim() ? 'not-allowed' : 'pointer',
                    opacity: !rawNotes.trim() ? 0.5 : 1,
                    transition: 'background-color 0.15s',
                  }}
                >
                  {isStreaming ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} />
                      Generate {format} draft
                    </>
                  )}
                </button>
              )}

              {/* Hint when no raw notes */}
              {!rawNotes.trim() && !isFinalized && (
                <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                  Add session notes on the left to generate a draft
                </p>
              )}

              {/* Streaming display */}
              {isStreaming && streamDisplay && (
                <div
                  className="rounded-lg border p-3"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <p className="mb-1.5 text-xs font-medium" style={{ color: 'var(--accent)' }}>
                    Generating…
                  </p>
                  <pre
                    className="whitespace-pre-wrap text-xs leading-relaxed"
                    style={{ color: 'var(--text-mid)', fontFamily: 'inherit' }}
                  >
                    {streamDisplay}
                    <span
                      className="ml-0.5 inline-block h-3 w-0.5 animate-pulse"
                      style={{ backgroundColor: 'var(--accent)', verticalAlign: 'middle' }}
                    />
                  </pre>
                </div>
              )}

              {/* Draft fields */}
              {!isStreaming && (
                <div className="space-y-3">
                  {formatFields[format].map(({ key, label, placeholder }) => (
                    <DraftTextarea
                      key={key}
                      label={label}
                      value={draft[key]}
                      onChange={(v) => setDraft((prev) => ({ ...prev, [key]: v }))}
                      disabled={isFinalized}
                      placeholder={placeholder}
                    />
                  ))}
                </div>
              )}

              {/* Finalize button */}
              {!isFinalized && !isStreaming && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowFinalizeConfirm(true)}
                    style={{
                      width: '100%',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.375rem',
                      padding: '0.625rem',
                      borderRadius: '0.5rem',
                      backgroundColor: 'rgba(16,185,129,0.12)',
                      color: 'var(--success)',
                      fontWeight: '600',
                      fontSize: '0.875rem',
                      border: '1px solid rgba(16,185,129,0.25)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <Lock size={14} />
                    Finalize note
                  </button>
                </div>
              )}

              {/* Finalized state */}
              {isFinalized && (
                <div
                  className="flex items-center justify-center gap-2 rounded-lg border py-4"
                  style={{
                    backgroundColor: 'rgba(16,185,129,0.06)',
                    borderColor: 'rgba(16,185,129,0.2)',
                  }}
                >
                  <Lock size={15} style={{ color: 'var(--success)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--success)' }}>
                    Note finalized
                    {note?.finalizedAt
                      ? ` · ${formatDateTime(note.finalizedAt)}`
                      : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
