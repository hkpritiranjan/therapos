import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { SessionsService } from './sessions.service';
import { SessionType, SessionStatus } from '@therapos/shared';

class CreateSessionDto {
  @IsString()
  patientId: string;

  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @IsEnum(['INDIVIDUAL', 'COUPLES', 'FAMILY', 'GROUP'])
  type?: SessionType;
}

class UpdateSessionDto {
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsEnum(['INDIVIDUAL', 'COUPLES', 'FAMILY', 'GROUP'])
  type?: SessionType;

  @IsOptional()
  @IsEnum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
  status?: SessionStatus;

  @IsOptional()
  @IsString()
  rawNotes?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: Request, @Body() dto: CreateSessionDto) {
    return this.sessionsService.create(req.user!, dto);
  }

  @Get(':id')
  findOne(@Req() req: Request, @Param('id') id: string) {
    return this.sessionsService.findOne(req.user!, id);
  }

  @Patch(':id')
  update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateSessionDto) {
    return this.sessionsService.update(req.user!, id, dto);
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  start(@Req() req: Request, @Param('id') id: string) {
    return this.sessionsService.start(req.user!, id);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  complete(@Req() req: Request, @Param('id') id: string) {
    return this.sessionsService.complete(req.user!, id);
  }
}
