import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // Import ConfigService
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Express } from 'express';

@Injectable()
export class AiAssistantService {
  private genAI: GoogleGenerativeAI;

  // Inject ConfigService into the constructor
  constructor(private configService: ConfigService) {
    // Use the ConfigService to get the API key
    const apiKey = this.configService.get<string>('GOOGLE_API_KEY');
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY is not set in the environment variables.');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  // Converts buffer to a format Google's model can understand
  private fileToGenerativePart(file: Express.Multer.File) {
    return {
      inlineData: {
        data: file.buffer.toString('base64'),
        mimeType: file.mimetype,
      },
    };
  }

  // Constructs the final prompt based on the generation type
  private getEnhancedPrompt(type: string, userPrompt: string, hasImage: boolean): string {
    // --- PROMPTS HAVE BEEN MODIFIED FOR SINGLE, DIRECT OUTPUT ---
    const topic = hasImage 
      ? `based on the provided image` 
      : `for the topic: "${userPrompt}"`;
    
    const context = hasImage && userPrompt 
      ? ` Use the following text as additional context: "${userPrompt}".` 
      : '';
    switch (type) {
      case 'Generate Hashtags':
    return `Generate 10-15 relevant and trending hashtags for the topic: "${userPrompt}". Return only the hashtags as a single string, each starting with #, without any extra text or labels.`;

  case 'Generate Description':
    return `Write one short, engaging, and readable social media description (2-3 sentences) for the topic: "${userPrompt}". Focus on the key points, and do NOT include hashtags or any extra text.`;

  case 'Generate Caption':
    return `Create one short, catchy, and attention-grabbing social media caption (1 sentence, up to 15 words) for the topic: "${userPrompt}". Only return the caption text, no explanations or extra text.`;

  case 'Generate Content':
    return `Create a single piece of social media content for the topic: "${userPrompt}". Start with a short, engaging caption (1 sentence), then on a new line provide 10-15 relevant hashtags. Return only the caption and hashtags, with no extra text or labels.`;

      default:
        return userPrompt; // Fallback to the original prompt
    }
  }
  async generateContent(
    prompt: string,
    type: string,
    image?: Express.Multer.File,
  ): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const hasImage = !!image;
    const enhancedPrompt = this.getEnhancedPrompt(type, prompt,hasImage);

    try {
      if (image) {
        // Multimodal generation (Image + Text)
        const imagePart = this.fileToGenerativePart(image);
        const result = await model.generateContent([enhancedPrompt, imagePart]);
        return result.response.text();
      } else {
        // Text-only generation
        const result = await model.generateContent(enhancedPrompt);
        return result.response.text();
      }
    } catch (error) {
      console.error('AI content generation failed:', error);
      throw new Error('Failed to get a response from the AI model.');
    }
  }
}