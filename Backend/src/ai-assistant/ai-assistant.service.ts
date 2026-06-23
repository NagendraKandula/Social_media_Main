import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Groq } from 'groq-sdk'; 
import { Express } from 'express';
import 'multer';

@Injectable()
export class AiAssistantService {
  private groq: Groq;
  private readonly textModel: string;
  private readonly visionModel: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    
    // Pull models from .env, with safe fallbacks just in case
    this.textModel = this.configService.get<string>('GROQ_TEXT_MODEL')!;
    this.visionModel = this.configService.get<string>('GROQ_VISION_MODEL')!;

    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not set in environment variables.');
    }
    this.groq = new Groq({ apiKey });
  }

  private getEnhancedPrompt(type: string, userPrompt: string, imageCount: number): string {
    const multiInstruction = imageCount > 1 
      ? `\n\nNOTE: You are analyzing ${imageCount} provided images. Please clearly structure your response, providing separate sections for Image 1, Image 2, etc.`
      : '';
    const context = userPrompt ? `Context provided by the user: "${userPrompt}".\n` : '';

    switch (type) {
      case 'Generate Hashtags':
        return `${context}Analyze the content and generate 15-20 highly engaging, trending, and niche-specific hashtags. Output ONLY the hashtags separated by spaces.${multiInstruction}`;
      case 'Generate Description':
        return `${context}Write an engaging, SEO-friendly 3-4 sentence description that perfectly captures the essence of the visual content or topic. Make it sound natural and compelling.${multiInstruction}`;
      case 'Generate Caption':
        return `${context}Create 3 distinct variations of a catchy, viral caption (1. Short & Punchy, 2. Funny/Witty, 3. Professional). Include relevant emojis.${multiInstruction}`;
      case 'Generate Content':
        return `${context}Act as a top-tier social media manager. Provide a complete, ready-to-publish post structure containing:
        1. Hook (to instantly grab attention)
        2. Body (value-driven or engaging story)
        3. Call to Action (CTA)
        4. Associated Hashtags
        ${multiInstruction}`;
      default:
        return userPrompt;
    }
  }

  async generateContent(
    prompt: string,
    type: string,
    images?: Express.Multer.File[],
  ): Promise<string> {
    const imageCount = images ? images.length : 0;
    const enhancedPrompt = this.getEnhancedPrompt(type, prompt, imageCount);
    
    const messageContent: any[] = [{ type: 'text', text: enhancedPrompt }];
    let isVisionRequest = false;

    if (images && images.length > 0) {
      isVisionRequest = true;
      images.slice(0, 5).forEach((image) => {
        const base64Image = image.buffer.toString('base64');
        messageContent.push({
          type: 'image_url',
          image_url: {
            url: `data:${image.mimetype};base64,${base64Image}`,
          },
        });
      });
    }

    const systemPrompt = "You are an expert Social Media Strategist agent. Your role is to analyze visual and text data to generate viral, highly-optimized social media content. Always return clean, readable output using formatting like bullet points or bold text where appropriate.";

    try {
      const chatCompletion = await this.groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: messageContent }
        ],
        // Dynamically select the model from the environment variables based on the request type
        model: isVisionRequest ? this.visionModel : this.textModel,
        temperature: 0.7,
        max_tokens: 1024,
      });

      return chatCompletion.choices[0]?.message?.content || 'No content generated.';
    } catch (error:any) {
      console.error('Groq AI generation failed:', error);
      throw new Error(`AI generation failed: ${error.message}`);
    }
  }
}