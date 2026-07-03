// Backend/src/ai-assistant/ai-assistant.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Express } from 'express';
import { GenerateContentDto } from './dto/generate-content.dto';
import 'multer';
@Injectable()
export class AiAssistantService {
  private genAI: GoogleGenerativeAI;
  private readonly defaultModel = 'gemini-2.5-flash'; // Best model for fast, multimodal tasks

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables.');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async analyzeAndGenerate(
    dto: GenerateContentDto,
    files?: Express.Multer.File[],
  ): Promise<string> {
    const { content, platforms, action, tone, language } = dto;

    // 1. Initialize the model with JSON configuration
    const model = this.genAI.getGenerativeModel({
      model: this.defaultModel,
      generationConfig: {
        responseMimeType: 'application/json', // Forces Gemini to return valid JSON
        temperature: 0.7,
      },
    });

    // 2. Construct the text prompt
   let userPrompt = `You are an expert Social Media Strategist AI. Analyze the provided inputs and media to generate an optimized social media strategy and content.\n\n`;
    
    if (content) userPrompt += `Existing text: "${content}".\n`;
    if (tone) userPrompt += `Desired tone: ${tone}.\n`;
    if (language) userPrompt += `Output language: ${language}.\n`;
    
    userPrompt += `
    You MUST respond with a JSON object exactly matching this schema. Fill in all fields based on the visual aesthetic and context of the image:
    {
      "analysis": {
        "summary": "Brief description of the media",
        "mood": "The emotional vibe (e.g., Magical, Professional, Cozy)",
        "audience": "Target demographic",
        "recommendedPlatforms": [
          { "platform": "Instagram", "rating": 5, "reason": "Why it works here" },
          { "platform": "LinkedIn", "rating": 1, "reason": "Why it fails here" }
        ],
        "bestAspectRatio": "e.g., 4:5, 1:1, 16:9",
        "engagementPrediction": "High, Medium, or Low",
        "bestPostingTime": "e.g., 7:00 PM - 9:00 PM"
      },
      "content": {
        "caption": "The actual post caption ready to be published",
        "hashtags": ["#tag1", "#tag2"],
        "cta": "A call to action for the end of the post",
        "emoji": ["✨", "🌙"]
      }
    }`;
    // 3. Prepare the payload array (mix of text and images)
    // Gemini accepts an array where items can be text strings or image objects
    const promptParts: any[] = [userPrompt];

    if (files && files.length > 0) {
      // Limit to 5 images to prevent payload size issues, though Gemini can handle more
      files.slice(0, 5).forEach((file) => {
        promptParts.push({
          inlineData: {
            data: file.buffer.toString('base64'),
            mimeType: file.mimetype,
          },
        });
      });
    }

    // 4. Generate the content
    try {
      const result = await model.generateContent(promptParts);
      
      // Because we set responseMimeType to application/json, this will be a clean JSON string
      return result.response.text(); 
    } catch (error: any) {
      console.error('Gemini AI generation failed:', error);
      throw new Error(`AI generation failed: ${error.message}`);
    }
  }
}