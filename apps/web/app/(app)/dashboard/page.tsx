import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarDays, Users, Plus, ArrowRight } from 'lucide-react';

export const metadata: Metadata = { title: 'Dashboard' };

function EmptyState({ icon: Icon, title, description }: {
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
      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{title}</p>
      <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{description}</p>
    </div>
  );
}

export default function DashboardPage() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Good morning
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{today}</p>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2">
          <Link
            href="/patients/new"
            className="btn-primary text-sm"
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
        {[
          { label: 'Active patients', value: '—', sub: 'Loading…' },
          { label: "Today's sessions", value: '0', sub: 'No sessions today' },
          { label: 'Pending notes', value: '—', sub: 'Notes to complete' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border p-5"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              {stat.label}
            </p>
            <p className="mt-2 text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {stat.value}
            </p>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{stat.sub}</p>
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
              style={{ color: 'var(--accent)' }}
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
              style={{ color: 'var(--accent)' }}
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <EmptyState
            icon={Users}
            title="Add your first patient"
            description="Your patient roster will appear here"
          />
        </section>
      </div>
    </div>
  );
}
