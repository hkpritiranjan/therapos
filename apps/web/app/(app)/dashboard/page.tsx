'use client';

import Link from 'next/link';
import { CalendarDays, Users, Plus, ArrowRight, ChevronRight } from 'lucide-react';
import { usePatients } from '@/lib/api';
import type { Patient, PatientStatus } from '@therapos/shared';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(p: Patient) {
  return `${p.firstName[0] ?? ''}${p.lastName[0] ?? ''}`.toUpperCase();
}

function statusBadge(status: PatientStatus) {
  const config: Record<PatientStatus, { label: string; bg: string; color: string }> = {
    ACTIVE: { label: 'Active', bg: 'rgba(16,185,129,0.15)', color: '#10B981' },
    INACTIVE: { label: 'Inactive', bg: 'rgba(148,163,184,0.1)', color: 'var(--text-mid)' },
    WAITLIST: { label: 'Waitlist', bg: 'rgba(245,158,11,0.15)', color: '#F59E0B' },
    DISCHARGED: { label: 'Discharged', bg: 'rgba(239,68,68,0.1)', color: '#EF4444' },
  };
  const c = config[status] ?? config.INACTIVE;
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
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
      className={`animate-pulse rounded-lg ${className ?? ''}`}
      style={{ backgroundColor: 'var(--bg-elevated)' }}
    />
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div
        className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl"
        style={{ backgroundColor: 'var(--accent-subtle)' }}
      >
        <Icon size={22} style={{ color: 'var(--accent)' }} />
      </div>
      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
        {title}
      </p>
      <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
        {description}
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Fetch all patients for stats + recent list
  const { data: allPatients, isLoading: patientsLoading } = usePatients({ limit: 50 });
  // Fetch active count specifically
  const { data: activeData } = usePatients({ status: 'ACTIVE', limit: 1 });

  const patients: Patient[] = allPatients?.data ?? [];
  const activeCount = activeData?.total ?? 0;
  const recentPatients = patients.slice(0, 3);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = [
    {
      label: 'Active patients',
      value: patientsLoading ? null : String(activeCount),
      sub: activeCount === 1 ? '1 active patient' : `${activeCount} active patients`,
    },
    {
      label: "Today's sessions",
      value: '0',
      sub: 'No sessions today',
    },
    {
      label: 'Total patients',
      value: patientsLoading ? null : String(allPatients?.total ?? 0),
      sub: 'In your roster',
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            {greeting}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{today}</p>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2">
          <Link
            href="/patients/new"
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
              textDecoration: 'none',
              transition: 'background-color 0.15s',
            }}
          >
            <Plus size={16} />
            New patient
          </Link>
          <Link
            href="/sessions/new"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--text-mid)',
              fontWeight: '500',
              fontSize: '0.875rem',
              textDecoration: 'none',
              border: '1px solid var(--border)',
            }}
          >
            <CalendarDays size={16} />
            New session
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border p-5"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <p
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}
            >
              {stat.label}
            </p>
            {stat.value === null ? (
              <Skeleton className="mt-2 h-8 w-16" />
            ) : (
              <p className="mt-2 text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {stat.value}
              </p>
            )}
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              {stat.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Today's sessions */}
        <section
          className="rounded-xl border"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <div
            className="flex items-center justify-between border-b px-5 py-4"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-2">
              <CalendarDays size={16} style={{ color: 'var(--accent)' }} />
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Today&apos;s sessions
              </h2>
            </div>
            <Link
              href="/sessions"
              className="flex items-center gap-1 text-xs"
              style={{ color: 'var(--accent)', textDecoration: 'none' }}
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <EmptyState
            icon={CalendarDays}
            title="No sessions scheduled today"
            description="Schedule a session to get started"
          />
        </section>

        {/* Recent patients */}
        <section
          className="rounded-xl border"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <div
            className="flex items-center justify-between border-b px-5 py-4"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-2">
              <Users size={16} style={{ color: 'var(--accent)' }} />
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Recent patients
              </h2>
            </div>
            <Link
              href="/patients"
              className="flex items-center gap-1 text-xs"
              style={{ color: 'var(--accent)', textDecoration: 'none' }}
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>

          {patientsLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : recentPatients.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Add your first patient"
              description="Your patient roster will appear here"
            />
          ) : (
            <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {recentPatients.map((patient) => (
                <li key={patient.id}>
                  <Link
                    href={`/patients/${patient.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[var(--bg-elevated)]"
                    style={{ textDecoration: 'none' }}
                  >
                    <div
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: 'var(--accent-subtle)',
                        color: 'var(--accent)',
                      }}
                    >
                      {getInitials(patient)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-sm font-medium"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {patient.firstName} {patient.lastName}
                      </p>
                      {patient.primaryConcerns.length > 0 && (
                        <p
                          className="truncate text-xs"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {patient.primaryConcerns.slice(0, 2).join(' · ')}
                        </p>
                      )}
                    </div>
                    {statusBadge(patient.status)}
                    <ChevronRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  </Link>
                </li>
              ))}
              {(allPatients?.total ?? 0) > 3 && (
                <li>
                  <Link
                    href="/patients"
                    className="flex items-center justify-center gap-1 py-3 text-xs transition-colors hover:bg-[var(--bg-elevated)]"
                    style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
                  >
                    View all {allPatients?.total} patients <ArrowRight size={11} />
                  </Link>
                </li>
              )}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
