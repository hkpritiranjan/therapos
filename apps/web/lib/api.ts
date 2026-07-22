import useSWR from 'swr';
import type {
  Patient,
  PatientStatus,
  PaginatedResponse,
  ApiResponse,
  CreatePatientDto,
  Session,
  SessionNote,
  NoteFormat,
  UpdateSessionDto,
} from '@therapos/shared';

export type { Session, SessionNote, NoteFormat };

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

const DEV_USER_ID = 'usr_dev01';

// ── Default headers ────────────────────────────────────────────────────────────

function getHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Always send dev auth header in development
  if (
    typeof window !== 'undefined' &&
    process.env.NODE_ENV !== 'production'
  ) {
    headers['Authorization'] = `Bearer dev-${DEV_USER_ID}`;
  }

  return headers;
}

// ── Generic fetcher for SWR ────────────────────────────────────────────────────

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: getHeaders() });

  if (!res.ok) {
    const error = new Error('API request failed') as Error & { status: number; info: unknown };
    error.status = res.status;
    try {
      error.info = await res.json();
    } catch {
      error.info = null;
    }
    throw error;
  }

  return res.json() as Promise<T>;
}

// ── Generic mutation helper ────────────────────────────────────────────────────

async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: getHeaders(),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw Object.assign(new Error(errorData.message ?? 'Request failed'), {
      status: res.status,
      data: errorData,
    });
  }

  return res.json() as Promise<T>;
}

// ── Patients ──────────────────────────────────────────────────────────────────

export interface UsePatientParams {
  status?: PatientStatus;
  q?: string;
  page?: number;
  limit?: number;
}

export function usePatients(params: UsePatientParams = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.q) query.set('q', params.q);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));

  const qs = query.toString();
  const url = `${BASE_URL}/patients${qs ? `?${qs}` : ''}`;

  return useSWR<PaginatedResponse<Patient>>(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });
}

export function usePatient(id: string | null) {
  const url = id ? `${BASE_URL}/patients/${id}` : null;

  return useSWR<ApiResponse<Patient>>(url, fetcher, {
    revalidateOnFocus: false,
  });
}

export async function createPatient(data: CreatePatientDto): Promise<ApiResponse<Patient>> {
  return apiRequest<ApiResponse<Patient>>('POST', '/patients', data);
}

export async function updatePatient(
  id: string,
  data: Partial<CreatePatientDto>,
): Promise<ApiResponse<Patient>> {
  return apiRequest<ApiResponse<Patient>>('PATCH', `/patients/${id}`, data);
}

export async function deletePatient(id: string): Promise<ApiResponse<Patient>> {
  return apiRequest<ApiResponse<Patient>>('DELETE', `/patients/${id}`);
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export function usePatientSessions(patientId: string | null, page = 1, limit = 10) {
  const url = patientId
    ? `${BASE_URL}/patients/${patientId}/sessions?page=${page}&limit=${limit}`
    : null;

  return useSWR(url, fetcher, { revalidateOnFocus: false });
}

// ── AI ────────────────────────────────────────────────────────────────────────

export async function generateSessionPrep(sessionId: string) {
  return apiRequest('POST', `/ai/prep/${sessionId}`);
}

export async function suggestHomework(sessionId: string) {
  return apiRequest('POST', '/ai/homework/suggest', { sessionId });
}

/**
 * Stream a note draft via SSE.
 * Returns an EventSource — caller is responsible for closing it.
 */
export function streamNoteDraft(
  sessionId: string,
  format: 'SOAP' | 'DAP' | 'BIRP' | 'FREE',
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: unknown) => void,
): AbortController {
  const controller = new AbortController();

  fetch(`${BASE_URL}/ai/note/draft`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ sessionId, format }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok || !res.body) {
        onError(new Error('Stream failed'));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            onDone();
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) onChunk(parsed.text);
            if (parsed.error) onError(new Error(parsed.error));
          } catch {
            // Skip unparseable lines
          }
        }
      }

      onDone();
    })
    .catch((err) => {
      if (err.name !== 'AbortError') onError(err);
    });

  return controller;
}

// ── Session hooks ─────────────────────────────────────────────────────────────

export function useSession(id: string | null) {
  const url = id ? `${BASE_URL}/sessions/${id}` : null;
  return useSWR<ApiResponse<Session>>(url, fetcher, { revalidateOnFocus: false });
}

export function useSessionNote(sessionId: string | null) {
  const url = sessionId ? `${BASE_URL}/sessions/${sessionId}/note` : null;
  return useSWR<ApiResponse<SessionNote>>(url, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
}

// ── Session mutations ─────────────────────────────────────────────────────────

export interface NotePayload {
  format?: NoteFormat;
  rawNotes?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  data?: string;
  dapAssessment?: string;
  dapPlan?: string;
  behavior?: string;
  intervention?: string;
  birpResponse?: string;
  birpPlan?: string;
  freeText?: string;
}

export async function createSession(data: {
  patientId: string;
  scheduledAt: string;
  type?: string;
}): Promise<ApiResponse<Session>> {
  return apiRequest<ApiResponse<Session>>('POST', '/sessions', data);
}

export async function updateSession(
  id: string,
  data: Partial<UpdateSessionDto>,
): Promise<ApiResponse<Session>> {
  return apiRequest<ApiResponse<Session>>('PATCH', `/sessions/${id}`, data);
}

export async function startSession(id: string): Promise<ApiResponse<Session>> {
  return apiRequest<ApiResponse<Session>>('POST', `/sessions/${id}/start`);
}

export async function completeSession(id: string): Promise<ApiResponse<Session>> {
  return apiRequest<ApiResponse<Session>>('POST', `/sessions/${id}/complete`);
}

export async function createNote(
  sessionId: string,
  data: NotePayload,
): Promise<ApiResponse<SessionNote>> {
  return apiRequest<ApiResponse<SessionNote>>('POST', `/sessions/${sessionId}/note`, data);
}

export async function updateNote(
  sessionId: string,
  data: NotePayload,
): Promise<ApiResponse<SessionNote>> {
  return apiRequest<ApiResponse<SessionNote>>('PATCH', `/sessions/${sessionId}/note`, data);
}

export async function finalizeNote(sessionId: string): Promise<ApiResponse<SessionNote>> {
  return apiRequest<ApiResponse<SessionNote>>('POST', `/sessions/${sessionId}/note/finalize`);
}

export async function generatePrep(sessionId: string): Promise<ApiResponse<unknown>> {
  return apiRequest<ApiResponse<unknown>>('POST', `/ai/prep/${sessionId}`);
}
