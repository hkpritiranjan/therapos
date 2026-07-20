import { Module } from '@nestjs/common';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';
import { PrismaService } from '../common/prisma.service';
import { DevAuthGuard } from '../common/dev-auth.guard';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({ name: 'notes' }),
  ],
  controllers: [NotesController],
  providers: [NotesService, PrismaService, DevAuthGuard],
  exports: [NotesService],
})
export class NotesModule {}
