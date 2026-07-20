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
import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { DevAuthGuard } from '../common/dev-auth.guard';
import { NotesService } from './notes.service';
import { NoteFormat } from '@therapos/shared';

class CreateNoteDto {
  @IsEnum(['SOAP', 'DAP', 'BIRP', 'FREE'])
  format: NoteFormat;

  // SOAP
  @IsOptional() @IsString() subjective?: string;
  @IsOptional() @IsString() objective?: string;
  @IsOptional() @IsString() assessment?: string;
  @IsOptional() @IsString() plan?: string;

  // DAP
  @IsOptional() @IsString() data?: string;
  @IsOptional() @IsString() dapAssessment?: string;
  @IsOptional() @IsString() dapPlan?: string;

  // BIRP
  @IsOptional() @IsString() behavior?: string;
  @IsOptional() @IsString() intervention?: string;
  @IsOptional() @IsString() birpResponse?: string;
  @IsOptional() @IsString() birpPlan?: string;

  // Free text
  @IsOptional() @IsString() freeText?: string;
}

class UpdateNoteDto {
  @IsOptional()
  @IsEnum(['SOAP', 'DAP', 'BIRP', 'FREE'])
  format?: NoteFormat;

  // SOAP
  @IsOptional() @IsString() subjective?: string;
  @IsOptional() @IsString() objective?: string;
  @IsOptional() @IsString() assessment?: string;
  @IsOptional() @IsString() plan?: string;

  // DAP
  @IsOptional() @IsString() data?: string;
  @IsOptional() @IsString() dapAssessment?: string;
  @IsOptional() @IsString() dapPlan?: string;

  // BIRP
  @IsOptional() @IsString() behavior?: string;
  @IsOptional() @IsString() intervention?: string;
  @IsOptional() @IsString() birpResponse?: string;
  @IsOptional() @IsString() birpPlan?: string;

  // Free text
  @IsOptional() @IsString() freeText?: string;
}

@UseGuards(DevAuthGuard)
@Controller('sessions/:sessionId/note')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  findOne(@Req() req: Request, @Param('sessionId') sessionId: string) {
    return this.notesService.findBySession(req.user!, sessionId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Req() req: Request,
    @Param('sessionId') sessionId: string,
    @Body() dto: CreateNoteDto,
  ) {
    return this.notesService.create(req.user!, sessionId, dto);
  }

  @Patch()
  update(
    @Req() req: Request,
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.notesService.update(req.user!, sessionId, dto);
  }

  @Post('finalize')
  @HttpCode(HttpStatus.OK)
  finalize(@Req() req: Request, @Param('sessionId') sessionId: string) {
    return this.notesService.finalize(req.user!, sessionId);
  }
}
