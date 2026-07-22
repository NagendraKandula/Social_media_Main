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
import { ChatAiDto } from './dto/chat-ai.dto';


@Controller('ai')
export class AiAssistantController {
  constructor(private readonly aiAssistantService: AiAssistantService) {}

  private parseAiResponse(result: string) {
    try {
      return JSON.parse(result);
    } catch {
      const fencedJson = result.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
      const objectJson = result.match(/\{[\s\S]*\}/)?.[0];
      const candidate = fencedJson || objectJson;

      if (candidate) {
        return JSON.parse(candidate);
      }

      throw new Error('AI returned an invalid response format.');
    }
  }

  @Post('generate')
  @UseInterceptors(FilesInterceptor('media')) // Matches the 'media[]' field from frontend
  async generateContent(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() generateContentDto: GenerateContentDto,
  ) {
    if (
      !generateContentDto.action &&
      !generateContentDto.content &&
      (!files || files.length === 0)
    ) {
      throw new BadRequestException('Choose an AI action or provide content or media.');
    }

    try {
      const result = await this.aiAssistantService.analyzeAndGenerate(
        generateContentDto,
        files,
      );
      
      // The service will return a structured JSON response containing recommendations
      return { success: true, data: this.parseAiResponse(result) };
    } catch (error: any) {
      throw new BadRequestException(`AI Error: ${error.message}`);
    }
  }
  @Post('chat')
@UseInterceptors(FilesInterceptor('media'))
async chatWithAi(
  @UploadedFiles() files: Express.Multer.File[],
  @Body() chatAiDto: ChatAiDto,
) {
  try {
    const result = await this.aiAssistantService.chatWithAnalysis(
      chatAiDto,
      files,
    );

    return {
      success: true,
      data: this.parseAiResponse(result),
    };
  } catch (error: any) {
    throw new BadRequestException(`AI Error: ${error.message}`);
  }
}
}
