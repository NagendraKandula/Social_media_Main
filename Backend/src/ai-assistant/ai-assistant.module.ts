import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config'; // Import ConfigModule and ConfigService
import { AiAssistantController } from './ai-assistant.controller';
import { AiAssistantService } from './ai-assistant.service';

@Module({
  imports: [ConfigModule], // Make sure ConfigModule is imported
  controllers: [AiAssistantController],
  providers: [AiAssistantService, ConfigService], // Add ConfigService to providers
})
export class AiAssistantModule {}