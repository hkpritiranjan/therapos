'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Bell, HelpCircle } from 'lucide-react';

function getBreadcrumbs(pathname: string): Array<{ label: string; href: string }> {
  const segments = pathname.split('/').filter(Boolean);

  const labelMap: Record<string, string> = {
    dashboard: 'Dashboard',
    patients: 'Patients',
    sessions: 'Sessions',
    notes: 'Notes',
    search: 'Search',
    settings: 'Settings',
    new: 'New',
  };

  const crumbs = segments.map((seg, i) => ({
    label: labelMap[seg] ?? (seg.length > 12 ? seg.slice(0, 12) + '…' : seg),
    href: '/' + segments.slice(0, i + 1).join('/'),
  }));

  return crumbs;
}

export function TopNav() {
  const pathname = usePathname();
  const crumbs = getBreadcrumbs(pathname);

  return (
    <header
      className="flex h-14 flex-shrink-0 items-center justify-between border-b px-6"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1.5">
            {i > 0 && (
              <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
            )}
            {i === crumbs.length - 1 ? (
              <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
                className="hover:text-[var(--text-primary)] transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      {/* Right side actions */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg-elevated)]"
          style={{ color: 'var(--text-muted)' }}
          title="Help"
        >
          <HelpCircle size={16} />
        </button>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg-elevated)]"
          style={{ color: 'var(--text-muted)' }}
          title="Notifications"
        >
          <Bell size={16} />
        </button>

        {/* Dev badge */}
        <div
          className="ml-2 rounded-full px-2 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            color: '#F59E0B',
            fontSize: '10px',
          }}
        >
          DEV
        </div>
      </div>
    </header>
  );
}
