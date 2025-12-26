import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiAssistantService } from './ai-assistant.service';
import { GenerateContentDto } from './dto/generate-content.dto';
import { Express } from 'express'; // Make sure to import Express

@Controller('ai-assistant')
export class AiAssistantController {
  constructor(private readonly aiAssistantService: AiAssistantService) {}

  @Post('generate')
  @UseInterceptors(FileInterceptor('image')) // 'image' must match the field name from the frontend
  async generateContent(
    @UploadedFile() file: Express.Multer.File,
    @Body() generateContentDto: GenerateContentDto,
  ) {
    const { prompt, type } = generateContentDto;

    if (!prompt && !file) {
      throw new BadRequestException('Prompt is required.');
    }

    try {
      const result = await this.aiAssistantService.generateContent(
        prompt,
        type,
        file,
      );
      return { success: true, data: result };
    } catch (error) {
      throw new BadRequestException(`Error generating content: ${error.message}`);
    }
  }
}