import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../common/prisma.service';

@Processor('notes')
export class EmbedNoteProcessor {
  private readonly logger = new Logger(EmbedNoteProcessor.name);
  private readonly openai: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.openai = new OpenAI({ apiKey: config.get('OPENAI_API_KEY') });
  }

  @Process('generate-embedding')
  async handleEmbedding(
    job: Job<{ noteId: string; sessionId: string; therapistId: string }>,
  ) {
    const { noteId, therapistId } = job.data;
    this.logger.log(`Embedding note ${noteId}`);

    const note = await this.prisma.sessionNote.findUnique({
      where: { id: noteId },
      include: { session: { include: { patient: true } } },
    });

    if (!note) {
      this.logger.warn(`Note ${noteId} not found`);
      return;
    }

    // Build text to embed from all non-null note fields
    const parts = [
      note.subjective,
      note.objective,
      note.assessment,
      note.plan,
      note.data,
      note.dapAssessment,
      note.dapPlan,
      note.behavior,
      note.intervention,
      note.birpResponse,
      note.birpPlan,
      note.freeText,
    ].filter(Boolean) as string[];

    if (parts.length === 0) {
      this.logger.warn(`Note ${noteId} has no text to embed`);
      return;
    }

    const content = parts.join('\n\n');

    // Generate 1536-dim embedding with text-embedding-3-small
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: content,
    });
    const vector = response.data[0].embedding;

    const patientId = note.session.patientId;

    // Upsert into NoteEmbedding using raw SQL for pgvector
    await this.prisma.$executeRaw`
      INSERT INTO "NoteEmbedding" (id, "noteId", "patientId", "therapistId", content, embedding, "createdAt")
      VALUES (
        ${crypto.randomUUID()},
        ${noteId},
        ${patientId},
        ${therapistId},
        ${content},
        ${`[${vector.join(',')}]`}::vector,
        NOW()
      )
      ON CONFLICT ("noteId") DO UPDATE
        SET content = EXCLUDED.content,
            embedding = EXCLUDED.embedding
    `;

    this.logger.log(`Embedded note ${noteId} for patient ${patientId}`);

    // Chain: refresh AI summary for this patient
    await this.refreshPatientSummary(patientId);
  }

  private async refreshPatientSummary(patientId: string) {
    this.logger.log(`Refreshing AI summary for patient ${patientId}`);

    const notes = await this.prisma.sessionNote.findMany({
      where: {
        isFinalized: true,
        session: { patientId },
      },
      orderBy: { finalizedAt: 'desc' },
      take: 10,
      include: { session: true },
    });

    if (notes.length === 0) return;

    const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) return;

    const noteSummaries = notes
      .map((n, i) => {
        const date = n.session.scheduledAt.toISOString().split('T')[0];
        const text = [n.subjective, n.data, n.behavior, n.freeText]
          .filter(Boolean)
          .join(' ');
        return `Session ${notes.length - i} (${date}): ${text.slice(0, 500)}`;
      })
      .join('\n\n');

    const prompt = `You are a clinical documentation assistant. Based on the following session notes for a therapy patient, write a concise clinical summary (3-5 sentences) that captures:
- The patient's primary presenting concerns and diagnoses
- Key therapeutic themes and patterns observed across sessions
- Progress toward treatment goals
- Current status and ongoing focus areas

This summary will be used to give the therapist quick context before each session.

PATIENT: ${patient.firstName} ${patient.lastName}
PRIMARY CONCERNS: ${patient.primaryConcerns.join(', ')}

RECENT SESSION NOTES (newest first):
${noteSummaries}

Write ONLY the summary paragraph. Clinical, third-person style. No headers.`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 300,
    });

    const summary = completion.choices[0]?.message?.content ?? '';
    if (summary) {
      await this.prisma.patient.update({
        where: { id: patientId },
        data: { aiSummary: summary, aiSummaryUpdatedAt: new Date() },
      });
      this.logger.log(`Updated AI summary for patient ${patientId}`);
    }
  }
}
