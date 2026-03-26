import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFiles, // Changed to plural
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express'; // Changed to plural
import { AiAssistantService } from './ai-assistant.service';
import { GenerateContentDto } from './dto/generate-content.dto';

@Controller('ai-assistant')
export class AiAssistantController {
  constructor(private readonly aiAssistantService: AiAssistantService) {}

  @Post('generate')
  @UseInterceptors(FilesInterceptor('images')) // Field name 'images' must match frontend
  async generateContent(
    @UploadedFiles() files: Express.Multer.File[], // Handles the array of images
    @Body() generateContentDto: GenerateContentDto,
  ) {
    const { prompt, type } = generateContentDto;

    if (!prompt && (!files || files.length === 0)) {
      throw new BadRequestException('Prompt or images are required.');
    }

    try {
      const result = await this.aiAssistantService.generateContent(
        prompt,
        type,
        files,
      );
      return { success: true, data: result };
    } catch (error) {
      throw new BadRequestException(`AI Error: ${error.message}`);
    }
  }
}