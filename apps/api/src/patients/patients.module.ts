import { Module } from '@nestjs/common';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { PrismaService } from '../common/prisma.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [PatientsController],
  providers: [PatientsService, PrismaService, JwtAuthGuard],
  exports: [PatientsService],
})
export class PatientsModule {}
