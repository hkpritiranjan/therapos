import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { Request } from 'express';
import { IsString, IsOptional, IsEmail, IsDateString, IsArray, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { DevAuthGuard } from '../common/dev-auth.guard';
import { PatientsService } from './patients.service';
import { PatientStatus } from '@therapos/shared';

class CreatePatientDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  preferredName?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  primaryConcerns?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  diagnoses?: string[];

  @IsOptional()
  @IsString()
  modality?: string;

  @IsOptional()
  @IsString()
  sessionFreq?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;
}

class UpdatePatientDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  preferredName?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  primaryConcerns?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  diagnoses?: string[];

  @IsOptional()
  @IsString()
  modality?: string;

  @IsOptional()
  @IsString()
  sessionFreq?: string;

  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE', 'WAITLIST', 'DISCHARGED'])
  status?: PatientStatus;
}

class PatientQueryDto {
  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE', 'WAITLIST', 'DISCHARGED'])
  status?: PatientStatus;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  page?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number;
}

@UseGuards(DevAuthGuard)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get()
  findAll(@Req() req: Request, @Query() query: PatientQueryDto) {
    return this.patientsService.findAll(req.user!, {
      status: query.status,
      q: query.q,
      page: query.page ?? 1,
      limit: query.limit ?? 25,
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: Request, @Body() dto: CreatePatientDto) {
    return this.patientsService.create(req.user!, dto);
  }

  @Get(':id')
  findOne(@Req() req: Request, @Param('id') id: string) {
    return this.patientsService.findOne(req.user!, id);
  }

  @Patch(':id')
  update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdatePatientDto) {
    return this.patientsService.update(req.user!, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Req() req: Request, @Param('id') id: string) {
    return this.patientsService.softDelete(req.user!, id);
  }

  @Get(':id/timeline')
  getTimeline(@Req() req: Request, @Param('id') id: string) {
    return this.patientsService.getTimeline(req.user!, id);
  }

  @Get(':id/sessions')
  getSessions(
    @Req() req: Request,
    @Param('id') id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.patientsService.getSessions(req.user!, id, page, limit);
  }
}
