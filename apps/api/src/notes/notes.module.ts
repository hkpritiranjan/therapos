import { Module } from '@nestjs/common';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';
import { PrismaService } from '../common/prisma.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({ name: 'notes' }),
  ],
  controllers: [NotesController],
  providers: [NotesService, PrismaService, JwtAuthGuard],
  exports: [NotesService],
})
export class NotesModule {}
