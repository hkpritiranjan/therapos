import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { PrismaService } from '../common/prisma.service';
import { DevAuthGuard } from '../common/dev-auth.guard';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [AiController],
  providers: [AiService, PrismaService, DevAuthGuard],
  exports: [AiService],
})
export class AiModule {}
