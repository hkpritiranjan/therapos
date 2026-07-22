import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { EmbedNoteProcessor } from './embed-note.processor';
import { PrismaService } from '../common/prisma.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'notes' }),
  ],
  providers: [EmbedNoteProcessor, PrismaService],
})
export class JobsModule {}
