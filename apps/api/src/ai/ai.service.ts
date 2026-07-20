import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import OpenAI from 'openai';
import { PrismaService } from '../common/prisma.service';
import { DevUser } from '../common/dev-auth.guard';
import {
  PatientContext,
  HomeworkSuggestion,
  SessionPrepResult,
  NoteFormat,
} from '@therapos/shared';

const CHARS_PER_TOKEN = 4;
const MAX_NOTE_TOKENS = 400;
const MAX_NOTE_CHARS = MAX_NOTE_TOKENS * CHARS_PER_TOKEN;

function truncate(text: string | null | undefined, maxChars: number): string {
  if (!text) return '';
  return text.length > maxChars ? text.slice(0, maxChars) + '…' : text;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openai: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: config.get<string>('OPENAI_API_KEY') ?? 'sk-placeholder',
    });
  }

  // ── Context assembly ────────────────────────────────────────────────────────

  async buildPatientContext(sessionId: string, user: DevUser): Promise<PatientContext> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { patient: true },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.therapistId !== user.id) throw new ForbiddenException('Access denied');

    const patientId = session.patientId;

    const [goals, recentSessions, recentHomework] = await Promise.all([
      this.prisma.goal.findMany({
        where: { patientId, status: { not: 'ABANDONED' } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.session.findMany({
        where: { patientId, id: { not: sessionId }, status: 'COMPLETED' },
        orderBy: { scheduledAt: 'desc' },
        take: 5,
        include: { note: true },
      }),
      this.prisma.homework.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),
    ]);

    // Truncate note content for token budget
    const processedSessions = recentSessions.map((s) => ({
      ...s,
      note: s.note
        ? {
            ...s.note,
            subjective: truncate(s.note.subjective, MAX_NOTE_CHARS),
            objective: truncate(s.note.objective, MAX_NOTE_CHARS),
            assessment: truncate(s.note.assessment, MAX_NOTE_CHARS),
            plan: truncate(s.note.plan, MAX_NOTE_CHARS),
            data: truncate(s.note.data, MAX_NOTE_CHARS),
            freeText: truncate(s.note.freeText, MAX_NOTE_CHARS),
          }
        : null,
    }));

    // Cast through unknown to reconcile Prisma's JsonValue with our Record<string,unknown> types
    return {
      patient: session.patient as unknown as PatientContext['patient'],
      goals: goals as unknown as PatientContext['goals'],
      recentSessions: processedSessions as unknown as PatientContext['recentSessions'],
      recentHomework: recentHomework as unknown as PatientContext['recentHomework'],
    };
  }

  private formatPatientContextForPrompt(ctx: PatientContext): string {
    const { patient, goals, recentSessions, recentHomework } = ctx;

    const lines: string[] = [
      `Patient: ${patient.firstName} ${patient.lastName}`,
      `Primary concerns: ${patient.primaryConcerns.join(', ') || 'Not specified'}`,
      `Diagnoses: ${patient.diagnoses.join(', ') || 'None documented'}`,
      `Modality: ${patient.modality || 'Not specified'}`,
      '',
      'Active Goals:',
      ...goals.map((g) => `  - ${g.title} [${g.status}]${g.description ? ': ' + g.description : ''}`),
      '',
      'Recent Sessions (last 5):',
      ...recentSessions.map((s, i) => {
        const date = new Date(s.scheduledAt).toLocaleDateString();
        const noteText = s.note
          ? `Note: ${s.note.subjective || s.note.data || s.note.freeText || '(no text)'}`.slice(0, 300)
          : '(no note)';
        return `  Session ${s.sessionNumber} (${date}): ${noteText}`;
      }),
      '',
      'Recent Homework:',
      ...recentHomework.map((h) => `  - ${h.title} [${h.status}]`),
    ];

    return lines.join('\n');
  }

  // ── Note draft generation (SSE) ─────────────────────────────────────────────

  async generateNotesDraft(
    sessionId: string,
    format: NoteFormat,
    user: DevUser,
    res: Response,
  ): Promise<void> {
    const ctx = await this.buildPatientContext(sessionId, user);

    // Fetch raw notes from the session
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    const rawNotes = session?.rawNotes ?? '';

    const systemPrompt = `You are a licensed clinical documentation assistant helping therapists write session notes.
You must:
- Never fabricate clinical information — only document what is evident from the therapist's notes
- Never diagnose — use clinical language describing observations
- Use "[Therapist to complete]" for any required section where insufficient information was provided
- Keep each section to 2-4 sentences
- Write in third-person clinical style (e.g., "Client reported…", "Therapist observed…")
- Be HIPAA-aware: do not include names unnecessarily; use "the client" or "the patient"`;

    const userPrompt = this.buildNotePrompt(format, rawNotes, ctx);

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      const stream = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: true,
        temperature: 0.3,
        max_tokens: 1200,
      });

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? '';
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err) {
      this.logger.error('OpenAI stream error', err);
      res.write(`data: ${JSON.stringify({ error: 'AI generation failed' })}\n\n`);
      res.end();
    }
  }

  private buildNotePrompt(format: NoteFormat, rawNotes: string, ctx: PatientContext): string {
    const context = this.formatPatientContextForPrompt(ctx);
    const notes = rawNotes || '(No raw notes provided — use patient history to draft sections)';

    switch (format) {
      case 'SOAP':
        return `Based on the following therapist's raw session notes and patient context, write a SOAP note.

PATIENT CONTEXT:
${context}

RAW SESSION NOTES:
${notes}

Write the note in this exact JSON format:
{
  "format": "SOAP",
  "subjective": "Client's self-reported experience, mood, and concerns this session. 2-4 sentences.",
  "objective": "Observable and measurable data: therapist's clinical observations, affect, behavior, engagement. 2-4 sentences.",
  "assessment": "Clinical assessment of progress, patterns, and therapeutic formulation. 2-4 sentences.",
  "plan": "Treatment plan for next steps, interventions, homework assigned, and next session focus. 2-4 sentences."
}

Return ONLY the JSON, no other text.`;

      case 'DAP':
        return `Based on the following therapist's raw session notes and patient context, write a DAP note.

PATIENT CONTEXT:
${context}

RAW SESSION NOTES:
${notes}

Write the note in this exact JSON format:
{
  "format": "DAP",
  "data": "Objective and subjective data from this session: what the client said and did, therapist observations. 2-4 sentences.",
  "dapAssessment": "Clinical assessment of the session data, progress toward goals, and therapeutic formulation. 2-4 sentences.",
  "dapPlan": "Plan for treatment continuation, homework, referrals, and next session. 2-4 sentences."
}

Return ONLY the JSON, no other text.`;

      case 'BIRP':
        return `Based on the following therapist's raw session notes and patient context, write a BIRP note.

PATIENT CONTEXT:
${context}

RAW SESSION NOTES:
${notes}

Write the note in this exact JSON format:
{
  "format": "BIRP",
  "behavior": "Client's presenting behaviors, statements, and affect this session. 2-4 sentences.",
  "intervention": "Therapeutic interventions used: specific techniques, exercises, discussions. 2-4 sentences.",
  "birpResponse": "Client's response to the interventions and engagement with the session. 2-4 sentences.",
  "birpPlan": "Plan for next session, homework assigned, and ongoing treatment approach. 2-4 sentences."
}

Return ONLY the JSON, no other text.`;

      default: // FREE
        return `Based on the following therapist's raw session notes and patient context, write a free-form session note.

PATIENT CONTEXT:
${context}

RAW SESSION NOTES:
${notes}

Write a comprehensive, narrative clinical note covering: presenting issues, session content, interventions, client response, and plan. 8-12 sentences.

Return ONLY the note text, no headers or formatting.`;
    }
  }

  // ── Session prep ────────────────────────────────────────────────────────────

  async generateSessionPrep(sessionId: string, user: DevUser): Promise<SessionPrepResult> {
    const ctx = await this.buildPatientContext(sessionId, user);
    const context = this.formatPatientContextForPrompt(ctx);

    const prompt = `You are a clinical documentation assistant. Based on the patient history below, generate a structured session preparation brief for the upcoming therapy session.

PATIENT CONTEXT:
${context}

Return a JSON object with:
{
  "keyTopics": ["3-5 topics likely to arise based on recent sessions and homework"],
  "suggestedInterventions": ["2-4 evidence-based interventions appropriate to this client"],
  "goalsToReview": ["goals that should be reviewed or updated this session"],
  "homeworkFollowUp": ["specific homework items to follow up on"],
  "clinicalConsiderations": "1-2 sentences on any clinical considerations the therapist should be aware of"
}

Return ONLY valid JSON.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content ?? '{}';
    return JSON.parse(content) as SessionPrepResult;
  }

  // ── Homework suggestions ─────────────────────────────────────────────────────

  async generateHomework(sessionId: string, user: DevUser): Promise<HomeworkSuggestion[]> {
    const ctx = await this.buildPatientContext(sessionId, user);
    const context = this.formatPatientContextForPrompt(ctx);

    const prompt = `You are a clinical documentation assistant. Based on the patient's therapy history, suggest 3 homework assignments appropriate for their current therapeutic work.

PATIENT CONTEXT:
${context}

Return a JSON array with exactly 3 items:
[
  {
    "title": "Short homework title",
    "description": "Detailed instructions for the client (2-3 sentences)",
    "category": "One of: CBT, DBT, Mindfulness, Behavioral, Journaling, Psychoeducation, Exposure, Social, Other",
    "rationale": "Why this homework is clinically appropriate for this client (1 sentence)"
  }
]

Return ONLY valid JSON array.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.6,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content ?? '{"items":[]}';
    const parsed = JSON.parse(content);
    // Handle both array and object responses
    return Array.isArray(parsed) ? parsed : (parsed.items ?? parsed.homework ?? []);
  }
}
