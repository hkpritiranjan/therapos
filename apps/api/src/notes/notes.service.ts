import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../common/prisma.service';
import { DevUser } from '../common/dev-auth.guard';
import { NoteFormat } from '@therapos/shared';

interface NoteData {
  format?: NoteFormat;
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

function countWords(text: string | null | undefined): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function noteWordCount(note: NoteData): number {
  const fields = [
    note.subjective, note.objective, note.assessment, note.plan,
    note.data, note.dapAssessment, note.dapPlan,
    note.behavior, note.intervention, note.birpResponse, note.birpPlan,
    note.freeText,
  ];
  return fields.reduce((sum, f) => sum + countWords(f), 0);
}

@Injectable()
export class NotesService {
  private readonly logger = new Logger(NotesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('notes') private readonly notesQueue: Queue,
  ) {}

  private async assertSessionAccess(user: DevUser, sessionId: string) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.therapistId !== user.id) throw new ForbiddenException('Access denied');
    return session;
  }

  async findBySession(user: DevUser, sessionId: string) {
    await this.assertSessionAccess(user, sessionId);

    const note = await this.prisma.sessionNote.findUnique({ where: { sessionId } });
    if (!note) throw new NotFoundException('Note not found for this session');

    return { success: true, data: note };
  }

  async create(user: DevUser, sessionId: string, data: NoteData) {
    await this.assertSessionAccess(user, sessionId);

    const existing = await this.prisma.sessionNote.findUnique({ where: { sessionId } });
    if (existing) throw new ConflictException('Note already exists for this session. Use PATCH to update.');

    const note = await this.prisma.sessionNote.create({
      data: {
        sessionId,
        format: data.format ?? 'SOAP',
        subjective: data.subjective,
        objective: data.objective,
        assessment: data.assessment,
        plan: data.plan,
        data: data.data,
        dapAssessment: data.dapAssessment,
        dapPlan: data.dapPlan,
        behavior: data.behavior,
        intervention: data.intervention,
        birpResponse: data.birpResponse,
        birpPlan: data.birpPlan,
        freeText: data.freeText,
        wordCount: noteWordCount(data),
      },
    });

    return { success: true, data: note };
  }

  async update(user: DevUser, sessionId: string, data: NoteData) {
    await this.assertSessionAccess(user, sessionId);

    const existing = await this.prisma.sessionNote.findUnique({ where: { sessionId } });
    if (!existing) throw new NotFoundException('Note not found. Create it first with POST.');
    if (existing.isFinalized) throw new BadRequestException('Cannot edit a finalized note');

    const updated = await this.prisma.sessionNote.update({
      where: { sessionId },
      data: {
        ...(data.format && { format: data.format }),
        subjective: data.subjective,
        objective: data.objective,
        assessment: data.assessment,
        plan: data.plan,
        data: data.data,
        dapAssessment: data.dapAssessment,
        dapPlan: data.dapPlan,
        behavior: data.behavior,
        intervention: data.intervention,
        birpResponse: data.birpResponse,
        birpPlan: data.birpPlan,
        freeText: data.freeText,
        editedAt: new Date(),
        wordCount: noteWordCount(data),
      },
    });

    return { success: true, data: updated };
  }

  async finalize(user: DevUser, sessionId: string) {
    await this.assertSessionAccess(user, sessionId);

    const note = await this.prisma.sessionNote.findUnique({ where: { sessionId } });
    if (!note) throw new NotFoundException('Note not found');
    if (note.isFinalized) throw new BadRequestException('Note is already finalized');

    const finalized = await this.prisma.sessionNote.update({
      where: { sessionId },
      data: { isFinalized: true, finalizedAt: new Date() },
    });

    // Queue a background job for embedding generation (placeholder)
    try {
      await this.notesQueue.add('generate-embedding', {
        noteId: finalized.id,
        sessionId,
        therapistId: user.id,
      });
    } catch (err) {
      // Redis unavailable — log and continue
      this.logger.warn(`Could not queue embedding job: ${(err as Error).message}`);
    }

    return { success: true, data: finalized, message: 'Note finalized' };
  }
}
