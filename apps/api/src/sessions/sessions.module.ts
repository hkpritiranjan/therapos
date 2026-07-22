import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { PrismaService } from '../common/prisma.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [SessionsController],
  providers: [SessionsService, PrismaService, JwtAuthGuard],
  exports: [SessionsService],
})
export class SessionsModule {}
