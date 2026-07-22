'use client';

import { useState, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, X, Plus } from 'lucide-react';
import { createPatient } from '@/lib/api';

// ── Tag input component ───────────────────────────────────────────────────────

const CONCERN_SUGGESTIONS = [
  'anxiety', 'depression', 'trauma', 'relationships', 'grief',
  'ADHD', 'stress', 'sleep', 'OCD',
];

function TagInput({
  value,
  onChange,
  placeholder,
  suggestions = [],
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
}) {
  const [inputVal, setInputVal] = useState('');

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (trimmed && !value.map(v => v.toLowerCase()).includes(trimmed.toLowerCase())) {
      onChange([...value, trimmed]);
    }
    setInputVal('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputVal);
    } else if (e.key === 'Backspace' && !inputVal && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  const filteredSuggestions = suggestions.filter(
    (s) => !value.map((v) => v.toLowerCase()).includes(s.toLowerCase()),
  );

  return (
    <div className="space-y-2">
      {/* Pills */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: 'var(--accent-subtle)',
                color: 'var(--accent)',
              }}
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-0.5 rounded-full hover:opacity-70"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <input
        type="text"
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (inputVal) addTag(inputVal); }}
        placeholder={placeholder ?? 'Type and press Enter or comma to add'}
        style={{
          width: '100%',
          padding: '0.5rem 0.75rem',
          borderRadius: '0.5rem',
          border: '1px solid var(--border)',
          backgroundColor: 'var(--bg-elevated)',
          color: 'var(--text-primary)',
          fontSize: '0.875rem',
          outline: 'none',
        }}
      />

      {/* Suggestions */}
      {filteredSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {filteredSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-xs transition-colors hover:bg-[var(--bg-elevated)]"
              style={{
                borderColor: 'var(--border)',
                color: 'var(--text-muted)',
              }}
            >
              <Plus size={9} />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────────

function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium"
        style={{ color: 'var(--text-primary)' }}
      >
        {label}
        {hint && (
          <span className="ml-1.5 font-normal" style={{ color: 'var(--text-muted)' }}>
            — {hint}
          </span>
        )}
      </label>
      {children}
      {error && (
        <p className="text-xs" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      )}
    </div>
  );
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
};

const inputErrorStyle = {
  ...inputStyle,
  border: '1px solid var(--danger)',
};

const selectStyle = {
  ...inputStyle,
  cursor: 'pointer',
};

// ── Page ──────────────────────────────────────────────────────────────────────

interface FormErrors {
  firstName?: string;
  lastName?: string;
  general?: string;
}

export default function NewPatientPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [primaryConcerns, setPrimaryConcerns] = useState<string[]>([]);
  const [diagnoses, setDiagnoses] = useState<string[]>([]);
  const [modality, setModality] = useState('');
  const [sessionFreq, setSessionFreq] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE' | 'WAITLIST'>('ACTIVE');

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const newErrors: FormErrors = {};
    if (!firstName.trim()) newErrors.firstName = 'First name is required';
    if (!lastName.trim()) newErrors.lastName = 'Last name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});

    try {
      const result = await createPatient({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        ...(preferredName.trim() && { preferredName: preferredName.trim() }),
        ...(email.trim() && { email: email.trim() }),
        ...(phone.trim() && { phone: phone.trim() }),
        ...(dateOfBirth && { dateOfBirth }),
        primaryConcerns,
        diagnoses,
        ...(modality && { modality }),
        ...(sessionFreq && { sessionFreq }),
      });

      router.push(`/patients/${result.data.id}`);
    } catch (err: unknown) {
      const e = err as { message?: string; data?: { message?: string } };
      setErrors({
        general: e.data?.message ?? e.message ?? 'Failed to create patient. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/patients"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '2rem',
            height: '2rem',
            borderRadius: '0.5rem',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-mid)',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            New Patient
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
            Add a new patient to your practice
          </p>
        </div>
      </div>

      {/* Form card */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border p-6 space-y-6"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        {/* General error */}
        {errors.general && (
          <div
            className="rounded-lg border px-4 py-3 text-sm"
            style={{
              backgroundColor: 'rgba(239,68,68,0.08)',
              borderColor: 'rgba(239,68,68,0.3)',
              color: 'var(--danger)',
            }}
          >
            {errors.general}
          </div>
        )}

        {/* Section: Basic info */}
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Basic Information
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="First name" htmlFor="firstName" error={errors.firstName}>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
                style={errors.firstName ? inputErrorStyle : inputStyle}
              />
            </Field>
            <Field label="Last name" htmlFor="lastName" error={errors.lastName}>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
                style={errors.lastName ? inputErrorStyle : inputStyle}
              />
            </Field>
            <Field label="Preferred name" htmlFor="preferredName" hint="How they like to be addressed">
              <input
                id="preferredName"
                type="text"
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
                style={inputStyle}
              />
            </Field>
            <Field label="Date of birth" htmlFor="dateOfBirth">
              <input
                id="dateOfBirth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                style={{
                  ...inputStyle,
                  colorScheme: 'dark',
                }}
              />
            </Field>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--border)' }} />

        {/* Section: Contact */}
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Contact
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Email" htmlFor="email">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                style={inputStyle}
              />
            </Field>
            <Field label="Phone" htmlFor="phone">
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                style={inputStyle}
              />
            </Field>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--border)' }} />

        {/* Section: Clinical */}
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Clinical Details
          </p>
          <div className="space-y-4">
            <Field label="Primary concerns" hint="Type and press Enter or comma to add">
              <TagInput
                value={primaryConcerns}
                onChange={setPrimaryConcerns}
                placeholder="e.g. anxiety, depression…"
                suggestions={CONCERN_SUGGESTIONS}
              />
            </Field>
            <Field label="Diagnoses" hint="ICD-10 codes or descriptive labels">
              <TagInput
                value={diagnoses}
                onChange={setDiagnoses}
                placeholder="e.g. F41.1, Major Depressive Disorder…"
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Modality" htmlFor="modality">
                <select
                  id="modality"
                  value={modality}
                  onChange={(e) => setModality(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">Select modality</option>
                  <option value="CBT">CBT</option>
                  <option value="DBT">DBT</option>
                  <option value="ACT">ACT</option>
                  <option value="Psychodynamic">Psychodynamic</option>
                  <option value="Humanistic">Humanistic</option>
                  <option value="EMDR">EMDR</option>
                  <option value="Integrative">Integrative</option>
                  <option value="Other">Other</option>
                </select>
              </Field>
              <Field label="Session frequency" htmlFor="sessionFreq">
                <select
                  id="sessionFreq"
                  value={sessionFreq}
                  onChange={(e) => setSessionFreq(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">Select frequency</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Bi-weekly">Bi-weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="As needed">As needed</option>
                </select>
              </Field>
              <Field label="Status" htmlFor="status">
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as typeof status)}
                  style={selectStyle}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="WAITLIST">Waitlist</option>
                </select>
              </Field>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--border)' }} />

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/patients"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              color: 'var(--text-mid)',
              fontSize: '0.875rem',
              fontWeight: '500',
              textDecoration: 'none',
            }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.5rem 1.25rem',
              borderRadius: '0.5rem',
              backgroundColor: loading ? 'var(--accent-hover)' : 'var(--accent)',
              color: '#fff',
              fontWeight: '500',
              fontSize: '0.875rem',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'background-color 0.15s, opacity 0.15s',
            }}
          >
            {loading ? 'Creating…' : 'Create patient'}
          </button>
        </div>
      </form>
    </div>
  );
}
