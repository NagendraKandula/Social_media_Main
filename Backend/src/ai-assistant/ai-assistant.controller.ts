// Backend/src/ai-assistant/ai-assistant.controller.ts
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFiles,
  Body,
  BadRequestException,
} from '@nestjs/common';
import 'multer';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AiAssistantService } from './ai-assistant.service';
import { GenerateContentDto } from './dto/generate-content.dto';


@Controller('ai')
export class AiAssistantController {
  constructor(private readonly aiAssistantService: AiAssistantService) {}

  @Post('generate')
  @UseInterceptors(FilesInterceptor('media')) // Matches the 'media[]' field from frontend
  async generateContent(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() generateContentDto: GenerateContentDto,
  ) {
    if (!generateContentDto.content && (!files || files.length === 0)) {
      throw new BadRequestException('Provide either existing content or media to analyze.');
    }

    try {
      const result = await this.aiAssistantService.analyzeAndGenerate(
        generateContentDto,
        files,
      );
      
      // The service will return a structured JSON response containing recommendations
      return { success: true, data: JSON.parse(result) };
    } catch (error: any) {
      throw new BadRequestException(`AI Error: ${error.message}`);
    }
  }
}