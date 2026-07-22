import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { PrismaService } from '../common/prisma.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [AiController],
  providers: [AiService, PrismaService, JwtAuthGuard],
  exports: [AiService],
})
export class AiModule {}
