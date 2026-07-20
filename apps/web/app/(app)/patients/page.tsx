'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Users, ChevronRight } from 'lucide-react';
import { usePatients } from '@/lib/api';
import type { Patient, PatientStatus } from '@therapos/shared';

function statusBadge(status: PatientStatus) {
  const classes: Record<PatientStatus, string> = {
    ACTIVE: 'badge-active',
    INACTIVE: 'badge-inactive',
    WAITLIST: 'badge-waitlist',
    DISCHARGED: 'badge-discharged',
  };
  return (
    <span className={classes[status] ?? 'badge'}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function getInitials(p: Patient) {
  return `${p.firstName[0] ?? ''}${p.lastName[0] ?? ''}`.toUpperCase();
}

function getDisplayName(p: Patient) {
  const preferred = p.preferredName ? ` "${p.preferredName}"` : '';
  return `${p.firstName}${preferred} ${p.lastName}`;
}

export default function PatientsPage() {
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<PatientStatus | ''>('');

  const { data, isLoading, error } = usePatients({
    q: q || undefined,
    status: statusFilter || undefined,
    limit: 50,
  });

  const patients: Patient[] = data?.data ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Patients
          </h1>
          {data && (
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              {data.total} {data.total === 1 ? 'patient' : 'patients'}
            </p>
          )}
        </div>
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
          }}
        >
          <Plus size={16} />
          New patient
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            placeholder="Search patients…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="input pl-9"
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem 0.5rem 2.25rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
            }}
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PatientStatus | '')}
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '0.5rem',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg-elevated)',
            color: statusFilter ? 'var(--text-primary)' : 'var(--text-muted)',
            fontSize: '0.875rem',
            minWidth: '160px',
          }}
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="WAITLIST">Waitlist</option>
          <option value="DISCHARGED">Discharged</option>
        </select>
      </div>

      {/* Patient list */}
      <div
        className="overflow-hidden rounded-xl border"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        {isLoading ? (
          <div className="flex flex-col gap-3 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-lg"
                style={{ backgroundColor: 'var(--bg-elevated)' }}
              />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="text-sm font-medium" style={{ color: 'var(--danger)' }}>
              Failed to load patients
            </p>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              Make sure the API is running at{' '}
              {process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}
            </p>
          </div>
        ) : patients.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div
              className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ backgroundColor: 'var(--accent-subtle)' }}
            >
              <Users size={22} style={{ color: 'var(--accent)' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {q || statusFilter ? 'No matching patients' : 'No patients yet'}
            </p>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              {q || statusFilter
                ? 'Try adjusting your search or filter'
                : 'Add your first patient to get started'}
            </p>
            {!q && !statusFilter && (
              <Link
                href="/patients/new"
                className="mt-4"
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
                }}
              >
                <Plus size={15} />
                Add patient
              </Link>
            )}
          </div>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {patients.map((patient) => (
              <li key={patient.id}>
                <Link
                  href={`/patients/${patient.id}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[var(--bg-elevated)]"
                  style={{ textDecoration: 'none' }}
                >
                  {/* Avatar */}
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                    style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)' }}
                  >
                    {getInitials(patient)}
                  </div>

                  {/* Name & concerns */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {getDisplayName(patient)}
                    </p>
                    {patient.primaryConcerns.length > 0 && (
                      <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--text-muted)' }}>
                        {patient.primaryConcerns.slice(0, 3).join(' · ')}
                      </p>
                    )}
                  </div>

                  {/* Status badge */}
                  <div className="flex-shrink-0">{statusBadge(patient.status)}</div>

                  {/* Arrow */}
                  <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
