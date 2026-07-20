import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { DevUser } from '../common/dev-auth.guard';
import { SessionType, SessionStatus } from '@therapos/shared';

interface CreateSessionData {
  patientId: string;
  scheduledAt: string;
  type?: SessionType;
}

interface UpdateSessionData {
  scheduledAt?: string;
  type?: SessionType;
  status?: SessionStatus;
  rawNotes?: string;
}

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(user: DevUser, data: CreateSessionData) {
    // Verify patient belongs to therapist
    const patient = await this.prisma.patient.findUnique({ where: { id: data.patientId } });
    if (!patient) throw new NotFoundException('Patient not found');
    if (patient.therapistId !== user.id) throw new ForbiddenException('Access denied');

    // Get next session number
    const lastSession = await this.prisma.session.findFirst({
      where: { patientId: data.patientId },
      orderBy: { sessionNumber: 'desc' },
    });
    const sessionNumber = (lastSession?.sessionNumber ?? 0) + 1;

    const session = await this.prisma.session.create({
      data: {
        patientId: data.patientId,
        therapistId: user.id,
        sessionNumber,
        scheduledAt: new Date(data.scheduledAt),
        type: data.type ?? 'INDIVIDUAL',
        status: 'SCHEDULED',
      },
      include: { patient: true },
    });

    return { success: true, data: session };
  }

  async findOne(user: DevUser, id: string) {
    const session = await this.prisma.session.findUnique({
      where: { id },
      include: {
        patient: true,
        note: true,
        homework: true,
      },
    });

    if (!session) throw new NotFoundException('Session not found');
    if (session.therapistId !== user.id) throw new ForbiddenException('Access denied');

    return { success: true, data: session };
  }

  async update(user: DevUser, id: string, data: UpdateSessionData) {
    const session = await this.prisma.session.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.therapistId !== user.id) throw new ForbiddenException('Access denied');

    const updated = await this.prisma.session.update({
      where: { id },
      data: {
        ...(data.scheduledAt && { scheduledAt: new Date(data.scheduledAt) }),
        ...(data.type && { type: data.type }),
        ...(data.status && { status: data.status }),
        ...(data.rawNotes !== undefined && { rawNotes: data.rawNotes }),
      },
      include: { patient: true },
    });

    return { success: true, data: updated };
  }

  async start(user: DevUser, id: string) {
    const session = await this.prisma.session.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.therapistId !== user.id) throw new ForbiddenException('Access denied');
    if (session.status !== 'SCHEDULED') {
      throw new BadRequestException(`Cannot start a session with status ${session.status}`);
    }

    const updated = await this.prisma.session.update({
      where: { id },
      data: { status: 'IN_PROGRESS', startedAt: new Date() },
    });

    return { success: true, data: updated };
  }

  async complete(user: DevUser, id: string) {
    const session = await this.prisma.session.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.therapistId !== user.id) throw new ForbiddenException('Access denied');

    const endedAt = new Date();
    const durationMins = session.startedAt
      ? Math.round((endedAt.getTime() - session.startedAt.getTime()) / 60000)
      : null;

    const updated = await this.prisma.session.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        endedAt,
        ...(durationMins !== null && { durationMins }),
      },
    });

    return { success: true, data: updated };
  }
}
