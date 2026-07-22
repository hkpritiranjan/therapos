import {
  Controller,
  Post,
  Body,
  Param,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Sse,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { AiService } from './ai.service';
import { NoteFormat } from '@therapos/shared';

class GenerateNoteDraftDto {
  @IsString()
  sessionId: string;

  @IsOptional()
  @IsEnum(['SOAP', 'DAP', 'BIRP', 'FREE'])
  format?: NoteFormat;
}

class SuggestHomeworkDto {
  @IsString()
  sessionId: string;
}

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /**
   * POST /ai/note/draft
   * Streams a note draft as Server-Sent Events.
   */
  @Post('note/draft')
  @HttpCode(HttpStatus.OK)
  async generateNoteDraft(
    @Req() req: Request,
    @Res() res: Response,
    @Body() dto: GenerateNoteDraftDto,
  ) {
    await this.aiService.generateNotesDraft(
      dto.sessionId,
      dto.format ?? 'SOAP',
      req.user!,
      res,
    );
  }

  /**
   * POST /ai/prep/:sessionId
   * Returns session preparation JSON.
   */
  @Post('prep/:sessionId')
  @HttpCode(HttpStatus.OK)
  async generatePrep(
    @Req() req: Request,
    @Param('sessionId') sessionId: string,
  ) {
    const result = await this.aiService.generateSessionPrep(sessionId, req.user!);
    return { success: true, data: result };
  }

  /**
   * POST /ai/homework/suggest
   * Returns 3 homework suggestion objects.
   */
  @Post('homework/suggest')
  @HttpCode(HttpStatus.OK)
  async suggestHomework(
    @Req() req: Request,
    @Body() dto: SuggestHomeworkDto,
  ) {
    const suggestions = await this.aiService.generateHomework(dto.sessionId, req.user!);
    return { success: true, data: suggestions };
  }
}
