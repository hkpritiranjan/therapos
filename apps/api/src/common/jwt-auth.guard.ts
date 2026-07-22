import {
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PrismaService } from './prisma.service';
import { DevUser } from './dev-auth.guard';

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
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private readonly isDev: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super();
    this.isDev = (config.get<string>('NODE_ENV') ?? 'development') !== 'production';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const authHeader = req.headers.authorization ?? '';

    // Dev-token fallback: "Bearer dev-<userId>"
    if (authHeader.startsWith('Bearer dev-')) {
      if (!this.isDev) {
        throw new UnauthorizedException('Dev auth is not available in production');
      }
      const userId = authHeader.slice('Bearer dev-'.length).trim();
      req.user = await this.resolveOrSeedUser(userId);
      return true;
    }

    // In development with no Authorization header at all, attach the default dev user
    if (this.isDev && !authHeader) {
      req.user = DEV_USER;
      return true;
    }

    // Otherwise delegate to Passport JWT (validates real JWT token)
    return super.canActivate(context) as Promise<boolean>;
  }

  private async resolveOrSeedUser(userId: string): Promise<DevUser> {
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

    if (userId === 'usr_dev01') return DEV_USER;
    return { ...DEV_USER, id: userId };
  }
}
