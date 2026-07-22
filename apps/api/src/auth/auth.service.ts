import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma.service';
import { DevUser } from '../common/dev-auth.guard';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(email: string, password: string, name: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(password, 10);
    const clerkId = `local_${crypto.randomUUID()}`;

    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        clerkId,
        passwordHash,
        credentials: [],
        modalities: [],
        subscription: {
          create: {
            plan: 'TRIAL',
            status: 'TRIALING',
          },
        },
      },
    });

    const token = this.jwt.sign({ sub: user.id, email: user.email });
    return { token, user: this.toSafeUser(user) };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const token = this.jwt.sign({ sub: user.id, email: user.email });
    return { token, user: this.toSafeUser(user) };
  }

  async validateUser(id: string): Promise<DevUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    return this.toDevUser(user);
  }

  private toDevUser(user: {
    id: string;
    email: string;
    name: string;
    clerkId: string;
    credentials: string[];
    modalities: string[];
    timezone: string;
  }): DevUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      clerkId: user.clerkId,
      credentials: user.credentials,
      modalities: user.modalities,
      timezone: user.timezone,
    };
  }

  private toSafeUser(user: {
    id: string;
    email: string;
    name: string;
    clerkId: string;
    credentials: string[];
    modalities: string[];
    timezone: string;
    createdAt: Date;
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      credentials: user.credentials,
      modalities: user.modalities,
      timezone: user.timezone,
      createdAt: user.createdAt,
    };
  }
}
