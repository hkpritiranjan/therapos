// ─── Enums ───────────────────────────────────────────────────────────────────

export type PatientStatus = 'ACTIVE' | 'INACTIVE' | 'WAITLIST' | 'DISCHARGED';

export type SessionType = 'INDIVIDUAL' | 'COUPLES' | 'FAMILY' | 'GROUP';

export type SessionStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export type NoteFormat = 'SOAP' | 'DAP' | 'BIRP' | 'FREE';

export type GoalStatus = 'ACTIVE' | 'ACHIEVED' | 'PAUSED' | 'ABANDONED';

export type HomeworkStatus = 'ASSIGNED' | 'COMPLETED' | 'PARTIAL' | 'SKIPPED';

export type Plan = 'TRIAL' | 'SOLO' | 'CLINIC';

export type SubStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'PAUSED' | 'CANCELLED';

// ─── Domain Interfaces ───────────────────────────────────────────────────────

export interface User {
  id: string;
  clerkId: string;
  email: string;
  name: string;
  licenseNumber?: string | null;
  licenseState?: string | null;
  credentials: string[];
  modalities: string[];
  timezone: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Patient {
  id: string;
  therapistId: string;
  firstName: string;
  lastName: string;
  preferredName?: string | null;
  dateOfBirth?: Date | string | null;
  email?: string | null;
  phone?: string | null;
  primaryConcerns: string[];
  diagnoses: string[];
  modality?: string | null;
  sessionFreq?: string | null;
  status: PatientStatus;
  startDate: Date | string;
  endDate?: Date | string | null;
  aiSummary?: string | null;
  aiSummaryUpdatedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Session {
  id: string;
  patientId: string;
  therapistId: string;
  sessionNumber: number;
  scheduledAt: Date | string;
  startedAt?: Date | string | null;
  endedAt?: Date | string | null;
  durationMins?: number | null;
  type: SessionType;
  status: SessionStatus;
  aiPrep?: Record<string, unknown> | null;
  aiPrepGenAt?: Date | string | null;
  rawNotes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface SessionNote {
  id: string;
  sessionId: string;
  format: NoteFormat;
  // SOAP
  subjective?: string | null;
  objective?: string | null;
  assessment?: string | null;
  plan?: string | null;
  // DAP
  data?: string | null;
  dapAssessment?: string | null;
  dapPlan?: string | null;
  // BIRP
  behavior?: string | null;
  intervention?: string | null;
  birpResponse?: string | null;
  birpPlan?: string | null;
  // Free text
  freeText?: string | null;
  // AI
  aiDraft?: Record<string, unknown> | null;
  aiGenerated: boolean;
  aiModel?: string | null;
  editedAt?: Date | string | null;
  isFinalized: boolean;
  finalizedAt?: Date | string | null;
  wordCount?: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Goal {
  id: string;
  patientId: string;
  title: string;
  description?: string | null;
  category?: string | null;
  status: GoalStatus;
  startedAt: Date | string;
  achievedAt?: Date | string | null;
  progressNotes: Record<string, unknown>[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Homework {
  id: string;
  patientId: string;
  sessionId?: string | null;
  title: string;
  description: string;
  category?: string | null;
  dueBy?: Date | string | null;
  aiGenerated: boolean;
  status: HomeworkStatus;
  completedAt?: Date | string | null;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  success: boolean;
}

export interface ApiError {
  success: false;
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}

// ─── Request/DTO Types ────────────────────────────────────────────────────────

export interface CreatePatientDto {
  firstName: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  primaryConcerns?: string[];
  diagnoses?: string[];
  modality?: string;
  sessionFreq?: string;
  startDate?: string;
}

export interface UpdatePatientDto extends Partial<CreatePatientDto> {
  status?: PatientStatus;
}

export interface CreateSessionDto {
  patientId: string;
  scheduledAt: string;
  type?: SessionType;
}

export interface UpdateSessionDto {
  scheduledAt?: string;
  type?: SessionType;
  status?: SessionStatus;
  rawNotes?: string;
}

export interface CreateNoteDto {
  format: NoteFormat;
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

export interface PatientWithFullName extends Patient {
  fullName: string;
  displayName: string;
}

// ─── AI Types ─────────────────────────────────────────────────────────────────

export interface PatientContext {
  patient: Patient;
  goals: Goal[];
  recentSessions: Array<Session & { note?: SessionNote | null }>;
  recentHomework: Homework[];
}

export interface HomeworkSuggestion {
  title: string;
  description: string;
  category: string;
  rationale: string;
}

export interface SessionPrepResult {
  keyTopics: string[];
  suggestedInterventions: string[];
  goalsToReview: string[];
  homeworkFollowUp: string[];
  clinicalConsiderations: string;
}
