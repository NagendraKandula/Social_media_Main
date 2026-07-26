import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFiles,
  Body,
  BadRequestException,
  UseGuards,
  Req,
} from '@nestjs/common';
import 'multer';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AiAssistantService } from './ai-assistant.service';
import { GenerateContentDto } from './dto/generate-content.dto';
import { ChatAiDto } from './dto/chat-ai.dto';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard'; // Adjust path if needed

@Controller('ai')
@UseGuards(JwtAuthGuard)
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
  @UseInterceptors(FilesInterceptor('media', 10))
  async generateContent(
    @Req() req: any,
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
      // Schema defines userId as Int, ensure we pass a number
      const userId = Number(req.user.id);
      
      const result = await this.aiAssistantService.analyzeAndGenerate(
        userId,
        generateContentDto,
        files,
      );
      
      return { success: true, data: this.parseAiResponse(result) };
    } catch (error: any) {
      throw new BadRequestException(`AI Error: ${error.message}`);
    }
  }

  @Post('chat')
  @UseInterceptors(FilesInterceptor('media', 10))
  async chatWithAi(
    @Req() req: any,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() chatAiDto: ChatAiDto,
  ) {
    try {
      const userId = Number(req.user.id);
      const result = await this.aiAssistantService.chatWithAnalysis(
        userId,
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