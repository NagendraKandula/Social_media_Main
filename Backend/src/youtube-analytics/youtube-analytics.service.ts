import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Ensure this path is correct
import axios from 'axios';
import { subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';

@Injectable()
export class YoutubeAnalyticsService {
  constructor(private prisma: PrismaService, private configService: ConfigService) {}
  // ... rest of your service logic remains the same
}