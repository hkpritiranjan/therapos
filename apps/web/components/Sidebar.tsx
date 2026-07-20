'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Search,
  Settings,
  FileText,
  ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  disabled?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Patients', href: '/patients', icon: Users },
  { label: 'Sessions', href: '/sessions', icon: CalendarDays, disabled: true, badge: 'Soon' },
  { label: 'Search', href: '/search', icon: Search, disabled: true, badge: 'Soon' },
  { label: 'Notes', href: '/notes', icon: FileText, disabled: true, badge: 'Soon' },
];

export function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  return (
    <aside
      className="flex h-full flex-col border-r"
      style={{
        width: 'var(--sidebar-w)',
        minWidth: 'var(--sidebar-w)',
        backgroundColor: 'var(--bg-sidebar)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 border-b px-5 py-5"
        style={{ borderColor: 'var(--border)' }}
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg text-lg"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
        >
          ⬡
        </div>
        <span
          className="text-base font-semibold tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          TherapOS
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                {item.disabled ? (
                  <div
                    className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2 text-sm opacity-40"
                    style={{ color: 'var(--text-mid)' }}
                  >
                    <Icon size={16} />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span
                        className="rounded-full px-1.5 py-0.5 text-xs"
                        style={{
                          backgroundColor: 'var(--bg-elevated)',
                          color: 'var(--text-muted)',
                          fontSize: '10px',
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    className={clsx(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                      active
                        ? 'font-medium'
                        : 'hover:bg-[var(--bg-elevated)]',
                    )}
                    style={{
                      color: active ? 'var(--text-primary)' : 'var(--text-mid)',
                      backgroundColor: active ? 'var(--accent-subtle)' : undefined,
                      textDecoration: 'none',
                    }}
                  >
                    <Icon
                      size={16}
                      style={{ color: active ? 'var(--accent)' : 'currentColor' }}
                    />
                    <span className="flex-1">{item.label}</span>
                    {active && (
                      <div
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: 'var(--accent)' }}
                      />
                    )}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>

        {/* Section: Settings */}
        <div className="mt-6 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
          <Link
            href="/settings"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-elevated)]"
            style={{ color: 'var(--text-mid)', textDecoration: 'none' }}
          >
            <Settings size={16} />
            Settings
          </Link>
        </div>
      </nav>

      {/* User area */}
      <div
        className="border-t px-3 py-3"
        style={{ borderColor: 'var(--border)' }}
      >
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-elevated)]"
          style={{ color: 'var(--text-mid)' }}
        >
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
            style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)' }}
          >
            DT
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
              Dev Therapist
            </p>
            <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>
              dev@therapos.local
            </p>
          </div>
          <ChevronRight size={14} />
        </button>
      </div>
    </aside>
  );
}
