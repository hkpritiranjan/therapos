'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Edit2,
  Brain,
  Calendar,
  Mail,
  Phone,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';
import {
  usePatient,
  usePatientSessions,
  createSession,
} from '@/lib/api';
import type { Session } from '@/lib/api';
import type { Patient, PatientStatus, SessionStatus, PaginatedResponse } from '@therapos/shared';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(p: Patient) {
  return `${p.firstName[0] ?? ''}${p.lastName[0] ?? ''}`.toUpperCase();
}

function getDisplayName(p: Patient) {
  const preferred = p.preferredName ? ` (${p.preferredName})` : '';
  return `${p.firstName} ${p.lastName}${preferred}`;
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PatientStatus }) {
  const config: Record<PatientStatus, { label: string; bg: string; color: string }> = {
    ACTIVE: { label: 'Active', bg: 'rgba(16,185,129,0.15)', color: '#10B981' },
    INACTIVE: { label: 'Inactive', bg: 'rgba(148,163,184,0.1)', color: 'var(--text-mid)' },
    WAITLIST: { label: 'Waitlist', bg: 'rgba(245,158,11,0.15)', color: '#F59E0B' },
    DISCHARGED: { label: 'Discharged', bg: 'rgba(239,68,68,0.1)', color: '#EF4444' },
  };
  const c = config[status] ?? config.INACTIVE;
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: c.bg, color: c.color }}
    >
      {c.label}
    </span>
  );
}

function SessionStatusBadge({ status }: { status: SessionStatus }) {
  const config: Record<SessionStatus, { label: string; bg: string; color: string }> = {
    SCHEDULED: { label: 'Scheduled', bg: 'rgba(59,130,246,0.15)', color: '#3B82F6' },
    IN_PROGRESS: { label: 'In Progress', bg: 'rgba(245,158,11,0.15)', color: '#F59E0B' },
    COMPLETED: { label: 'Completed', bg: 'rgba(16,185,129,0.15)', color: '#10B981' },
    CANCELLED: { label: 'Cancelled', bg: 'rgba(239,68,68,0.1)', color: '#EF4444' },
    NO_SHOW: { label: 'No Show', bg: 'rgba(148,163,184,0.1)', color: 'var(--text-mid)' },
  };
  const c = config[status] ?? config.SCHEDULED;
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: c.bg, color: c.color }}
    >
      {c.label}
    </span>
  );
}

// ── New Session Modal ─────────────────────────────────────────────────────────

function NewSessionModal({
  patientId,
  patientName,
  onClose,
}: {
  patientId: string;
  patientName: string;
  onClose: () => void;
}) {
  const router = useRouter();

  // Default to now + 1 hour, rounded to next 15 min
  function defaultDateTime() {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
    // Format to datetime-local
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  const [scheduledAt, setScheduledAt] = useState(defaultDateTime());
  const [type, setType] = useState<'INDIVIDUAL' | 'COUPLES' | 'FAMILY' | 'GROUP'>('INDIVIDUAL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!scheduledAt) {
      setError('Date and time are required');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const result = await createSession({
        patientId,
        scheduledAt: new Date(scheduledAt).toISOString(),
        type,
      });
      router.push(`/patients/${patientId}/sessions/${result.data.id}`);
    } catch (err: unknown) {
      const e = err as { message?: string; data?: { message?: string } };
      setError(e.data?.message ?? e.message ?? 'Failed to create session');
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    borderRadius: '0.5rem',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    fontSize: '0.875rem',
    outline: 'none',
    colorScheme: 'dark' as const,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className="relative w-full max-w-md rounded-xl border shadow-2xl"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="border-b px-6 py-4" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            New Session
          </h2>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
            {patientName}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div
              className="rounded-lg px-3 py-2 text-sm"
              style={{
                backgroundColor: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: 'var(--danger)',
              }}
            >
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Date &amp; Time
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Session type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="INDIVIDUAL">Individual</option>
              <option value="COUPLES">Couples</option>
              <option value="FAMILY">Family</option>
              <option value="GROUP">Group</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                color: 'var(--text-mid)',
                fontSize: '0.875rem',
                fontWeight: '500',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.5rem 1.25rem',
                borderRadius: '0.5rem',
                backgroundColor: 'var(--accent)',
                color: '#fff',
                fontWeight: '500',
                fontSize: '0.875rem',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Creating…' : 'Create session'}
            </button>
          </div>
        </form>
      </div>
    </div>
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data: patientResp, isLoading: patientLoading, error: patientError } = usePatient(id);
  const { data: sessionsRaw, isLoading: sessionsLoading } = usePatientSessions(id);

  const patient = patientResp?.data;
  const sessions: Session[] = (sessionsRaw as PaginatedResponse<Session> | undefined)?.data ?? [];
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
  );

  const [showModal, setShowModal] = useState(false);

  // ── Loading state ──────────────────────────────────────────────────────────

  if (patientLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="rounded-xl border p-6" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-start gap-5">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-7 w-64" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-80" />
            </div>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Skeleton className="h-48" />
          </div>
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  // ── Error / Not found ──────────────────────────────────────────────────────

  if (patientError || !patient) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Link
          href="/patients"
          className="inline-flex items-center gap-2 text-sm"
          style={{ color: 'var(--text-mid)', textDecoration: 'none' }}
        >
          <ArrowLeft size={15} /> Back to patients
        </Link>
        <div className="flex flex-col items-center py-20">
          <p className="text-sm font-medium" style={{ color: 'var(--danger)' }}>
            {patientError?.status === 404 ? 'Patient not found' : 'Failed to load patient'}
          </p>
          <Link
            href="/patients"
            className="mt-4 text-sm"
            style={{ color: 'var(--accent)', textDecoration: 'none' }}
          >
            Return to patients
          </Link>
        </div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <>
      {showModal && (
        <NewSessionModal
          patientId={id}
          patientName={getDisplayName(patient)}
          onClose={() => setShowModal(false)}
        />
      )}

      <div className="mx-auto max-w-5xl space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          <Link href="/patients" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
            Patients
          </Link>
          <ChevronRight size={13} />
          <span style={{ color: 'var(--text-primary)' }}>{patient.firstName} {patient.lastName}</span>
        </div>

        {/* ── Header card ── */}
        <div
          className="rounded-xl border p-6"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            {/* Avatar */}
            <div
              className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full text-xl font-bold"
              style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)' }}
            >
              {getInitials(patient)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {getDisplayName(patient)}
                </h1>
                <StatusBadge status={patient.status} />
              </div>

              {/* Meta row */}
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                {patient.modality && (
                  <span>{patient.modality}</span>
                )}
                {patient.modality && patient.sessionFreq && (
                  <span style={{ color: 'var(--border)' }}>·</span>
                )}
                {patient.sessionFreq && (
                  <span>{patient.sessionFreq}</span>
                )}
                {patient.dateOfBirth && (
                  <>
                    <span style={{ color: 'var(--border)' }}>·</span>
                    <span>
                      DOB {formatDate(patient.dateOfBirth)}
                    </span>
                  </>
                )}
              </div>

              {/* Primary concerns */}
              {patient.primaryConcerns.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {patient.primaryConcerns.map((c) => (
                    <span
                      key={c}
                      className="rounded-full px-2 py-0.5 text-xs"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        color: 'var(--text-muted)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-shrink-0 gap-2">
              <button
                onClick={() => setShowModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  backgroundColor: 'var(--accent)',
                  color: '#fff',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Plus size={15} />
                New session
              </button>
              <button
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.5rem 0.875rem',
                  borderRadius: '0.5rem',
                  backgroundColor: 'transparent',
                  color: 'var(--text-mid)',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                <Edit2 size={14} />
                Edit
              </button>
            </div>
          </div>

          {/* AI Summary */}
          {patient.aiSummary && (
            <div
              className="mt-5 rounded-lg border p-4"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border)',
              }}
            >
              <div className="mb-2 flex items-center gap-2">
                <Brain size={15} style={{ color: 'var(--accent)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                  AI Summary
                </span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-mid)' }}>
                {patient.aiSummary}
              </p>
            </div>
          )}
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: sessions */}
          <div className="space-y-4 lg:col-span-2">
            <section
              className="overflow-hidden rounded-xl border"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
              <div
                className="flex items-center justify-between border-b px-5 py-4"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="flex items-center gap-2">
                  <Calendar size={15} style={{ color: 'var(--accent)' }} />
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Sessions
                  </h2>
                  {sessions.length > 0 && (
                    <span
                      className="rounded-full px-1.5 py-0.5 text-xs"
                      style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                    >
                      {sessions.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center gap-1 text-xs font-medium"
                  style={{ color: 'var(--accent)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  <Plus size={12} /> New
                </button>
              </div>

              {sessionsLoading ? (
                <div className="space-y-3 p-5">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14" />
                  ))}
                </div>
              ) : sortedSessions.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <div
                    className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: 'var(--accent-subtle)' }}
                  >
                    <Calendar size={18} style={{ color: 'var(--accent)' }} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    No sessions yet
                  </p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    Schedule the first session to get started
                  </p>
                  <button
                    onClick={() => setShowModal(true)}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium"
                    style={{
                      padding: '0.4rem 0.875rem',
                      borderRadius: '0.5rem',
                      backgroundColor: 'var(--accent)',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={14} />
                    Schedule session
                  </button>
                </div>
              ) : (
                <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {sortedSessions.map((session) => (
                    <li key={session.id}>
                      <Link
                        href={`/patients/${id}/sessions/${session.id}`}
                        className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[var(--bg-elevated)]"
                        style={{ textDecoration: 'none' }}
                      >
                        {/* Session # badge */}
                        <div
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                          style={{
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-mid)',
                            border: '1px solid var(--border)',
                          }}
                        >
                          #{session.sessionNumber}
                        </div>

                        {/* Date + type */}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {formatDateTime(session.scheduledAt)}
                          </p>
                          <p className="mt-0.5 text-xs capitalize" style={{ color: 'var(--text-muted)' }}>
                            {session.type.charAt(0) + session.type.slice(1).toLowerCase()}
                            {session.durationMins ? ` · ${session.durationMins} min` : ''}
                          </p>
                        </div>

                        {/* Status */}
                        <SessionStatusBadge status={session.status} />

                        <ChevronRight size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Right: info cards */}
          <div className="space-y-4">
            {/* Patient info */}
            <div
              className="rounded-xl border p-4"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Patient Info
              </p>
              <dl className="space-y-2.5">
                {patient.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <dd className="truncate text-sm" style={{ color: 'var(--text-primary)' }}>
                      {patient.email}
                    </dd>
                  </div>
                )}
                {patient.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <dd className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      {patient.phone}
                    </dd>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <dd className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    Started {formatDate(patient.startDate)}
                  </dd>
                </div>
                {patient.diagnoses.length > 0 && (
                  <div className="pt-1">
                    <p className="mb-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>Diagnoses</p>
                    <div className="flex flex-wrap gap-1">
                      {patient.diagnoses.map((d) => (
                        <span
                          key={d}
                          className="rounded px-1.5 py-0.5 text-xs"
                          style={{
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-muted)',
                            border: '1px solid var(--border)',
                          }}
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </dl>
            </div>

            {/* Quick stats */}
            <div
              className="rounded-xl border p-4"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Quick Stats
              </p>
              <dl className="space-y-3">
                <div className="flex items-center justify-between">
                  <dt className="text-sm" style={{ color: 'var(--text-muted)' }}>Total sessions</dt>
                  <dd className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {sessions.length}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-sm" style={{ color: 'var(--text-muted)' }}>Completed</dt>
                  <dd className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {sessions.filter((s) => s.status === 'COMPLETED').length}
                  </dd>
                </div>
                {sortedSessions[0] && (
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                      <Clock size={11} /> Last session
                    </dt>
                    <dd className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      {formatDate(sortedSessions[0].scheduledAt)}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
