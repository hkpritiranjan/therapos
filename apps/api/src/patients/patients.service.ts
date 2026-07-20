import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { DevUser } from '../common/dev-auth.guard';
import { PatientStatus } from '@therapos/shared';

interface FindAllOptions {
  status?: PatientStatus;
  q?: string;
  page: number;
  limit: number;
}

interface CreatePatientData {
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

interface UpdatePatientData extends Partial<CreatePatientData> {
  status?: PatientStatus;
}

@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: DevUser, options: FindAllOptions) {
    const { status, q, page, limit } = options;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { therapistId: user.id };
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { sessions: true, goals: true } },
        },
      }),
      this.prisma.patient.count({ where }),
    ]);

    return {
      success: true,
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(user: DevUser, data: CreatePatientData) {
    const patient = await this.prisma.patient.create({
      data: {
        therapistId: user.id,
        firstName: data.firstName,
        lastName: data.lastName,
        preferredName: data.preferredName,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        email: data.email,
        phone: data.phone,
        primaryConcerns: data.primaryConcerns ?? [],
        diagnoses: data.diagnoses ?? [],
        modality: data.modality,
        sessionFreq: data.sessionFreq,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        status: 'ACTIVE',
      },
    });

    return { success: true, data: patient };
  }

  async findOne(user: DevUser, id: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: {
        goals: { where: { status: { not: 'ABANDONED' } }, orderBy: { createdAt: 'desc' } },
        homework: { orderBy: { createdAt: 'desc' }, take: 5 },
        _count: { select: { sessions: true } },
      },
    });

    if (!patient) throw new NotFoundException('Patient not found');
    if (patient.therapistId !== user.id) throw new ForbiddenException('Access denied');

    return { success: true, data: patient };
  }

  async update(user: DevUser, id: string, data: UpdatePatientData) {
    const patient = await this.prisma.patient.findUnique({ where: { id } });
    if (!patient) throw new NotFoundException('Patient not found');
    if (patient.therapistId !== user.id) throw new ForbiddenException('Access denied');

    const updated = await this.prisma.patient.update({
      where: { id },
      data: {
        ...(data.firstName && { firstName: data.firstName }),
        ...(data.lastName && { lastName: data.lastName }),
        ...(data.preferredName !== undefined && { preferredName: data.preferredName }),
        ...(data.dateOfBirth && { dateOfBirth: new Date(data.dateOfBirth) }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.primaryConcerns && { primaryConcerns: data.primaryConcerns }),
        ...(data.diagnoses && { diagnoses: data.diagnoses }),
        ...(data.modality !== undefined && { modality: data.modality }),
        ...(data.sessionFreq !== undefined && { sessionFreq: data.sessionFreq }),
        ...(data.status && { status: data.status }),
      },
    });

    return { success: true, data: updated };
  }

  async softDelete(user: DevUser, id: string) {
    const patient = await this.prisma.patient.findUnique({ where: { id } });
    if (!patient) throw new NotFoundException('Patient not found');
    if (patient.therapistId !== user.id) throw new ForbiddenException('Access denied');

    const updated = await this.prisma.patient.update({
      where: { id },
      data: { status: 'DISCHARGED', endDate: new Date() },
    });

    return { success: true, data: updated, message: 'Patient discharged' };
  }

  async getTimeline(user: DevUser, id: string) {
    const patient = await this.prisma.patient.findUnique({ where: { id } });
    if (!patient) throw new NotFoundException('Patient not found');
    if (patient.therapistId !== user.id) throw new ForbiddenException('Access denied');

    const sessions = await this.prisma.session.findMany({
      where: { patientId: id },
      orderBy: { scheduledAt: 'desc' },
      include: {
        note: {
          select: {
            id: true,
            format: true,
            isFinalized: true,
            wordCount: true,
          },
        },
      },
    });

    const goals = await this.prisma.goal.findMany({
      where: { patientId: id },
      orderBy: { createdAt: 'desc' },
    });

    const homework = await this.prisma.homework.findMany({
      where: { patientId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      success: true,
      data: {
        patient,
        sessions,
        goals,
        homework,
      },
    };
  }

  async getSessions(user: DevUser, id: string, page: number, limit: number) {
    const patient = await this.prisma.patient.findUnique({ where: { id } });
    if (!patient) throw new NotFoundException('Patient not found');
    if (patient.therapistId !== user.id) throw new ForbiddenException('Access denied');

    const skip = (page - 1) * limit;
    const [sessions, total] = await this.prisma.$transaction([
      this.prisma.session.findMany({
        where: { patientId: id },
        skip,
        take: limit,
        orderBy: { scheduledAt: 'desc' },
        include: { note: true },
      }),
      this.prisma.session.count({ where: { patientId: id } }),
    ]);

    return {
      success: true,
      data: sessions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
