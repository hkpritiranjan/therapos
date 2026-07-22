import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PrismaService } from './prisma.service';

export interface DevUser {
  id: string;
  email: string;
  name: string;
  clerkId: string;
  credentials: string[];
  modalities: string[];
  timezone: string;
}

// Merge DevUser fields into Express.User so req.user carries our shape
// (passport already declares req.user as Express.User | undefined)
declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      name: string;
      clerkId: string;
      credentials: string[];
      modalities: string[];
      timezone: string;
    }
  }
}

const DEV_USER: DevUser = {
  id: 'usr_dev01',
  email: 'dev@therapos.local',
  name: 'Dev Therapist',
  clerkId: 'clerk_dev01',
  credentials: ['LPC'],
  modalities: ['CBT', 'DBT'],
  timezone: 'America/New_York',
};

@Injectable()
export class DevAuthGuard implements CanActivate {
  private readonly logger = new Logger(DevAuthGuard.name);
  private readonly isDev: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.isDev = (config.get<string>('NODE_ENV') ?? 'development') !== 'production';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const authHeader = req.headers.authorization ?? '';

    // ── Dev bearer token: "Bearer dev-<userId>" ──────────────────────────────
    if (authHeader.startsWith('Bearer dev-')) {
      const userId = authHeader.slice('Bearer dev-'.length).trim();
      const user = await this.resolveOrSeedUser(userId);
      req.user = user;
      return true;
    }

    // ── No auth in dev — attach default dev user ──────────────────────────────
    if (this.isDev) {
      req.user = DEV_USER;
      return true;
    }

    throw new UnauthorizedException('Authentication required');
  }

  private async resolveOrSeedUser(userId: string): Promise<DevUser> {
    // Try to find in DB first; fall back to mock if DB is unavailable
    try {
      const dbUser = await this.prisma.user.findUnique({ where: { id: userId } });
      if (dbUser) {
        return {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          clerkId: dbUser.clerkId,
          credentials: dbUser.credentials,
          modalities: dbUser.modalities,
          timezone: dbUser.timezone,
        };
      }

      // Seed the dev user if it doesn't exist
      if (userId === 'usr_dev01') {
        const created = await this.prisma.user.upsert({
          where: { clerkId: 'clerk_dev01' },
          update: {},
          create: {
            id: 'usr_dev01',
            clerkId: 'clerk_dev01',
            email: 'dev@therapos.local',
            name: 'Dev Therapist',
            credentials: ['LPC'],
            modalities: ['CBT', 'DBT'],
            timezone: 'America/New_York',
          },
        });
        return {
          id: created.id,
          email: created.email,
          name: created.name,
          clerkId: created.clerkId,
          credentials: created.credentials,
          modalities: created.modalities,
          timezone: created.timezone,
        };
      }
    } catch (err) {
      this.logger.warn(`DB unavailable, using mock dev user: ${(err as Error).message}`);
    }

    // Fall back to mock if user is the known dev user
    if (userId === 'usr_dev01') {
      return DEV_USER;
    }

    return { ...DEV_USER, id: userId };
  }
}
