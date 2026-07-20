import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { PrismaService } from './common/prisma.service';
import { PatientsModule } from './patients/patients.module';
import { SessionsModule } from './sessions/sessions.module';
import { NotesModule } from './notes/notes.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    // Config — reads .env file, available globally
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),

    // BullMQ — backed by Redis
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: config.get<string>('REDIS_URL', 'redis://localhost:6379'),
      }),
    }),

    // Feature modules
    PatientsModule,
    SessionsModule,
    NotesModule,
    AiModule,
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
