import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Groq } from 'groq-sdk'; // Changed from @google/generative-ai
import { Express } from 'express';

@Injectable()
export class AiAssistantService {
  private groq: Groq;
  private readonly MODEL_ID = 'meta-llama/llama-4-maverick-17b-128e-instruct';

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not set in environment variables.');
    }
    this.groq = new Groq({ apiKey }); // Initialize Groq client
  }

  private getEnhancedPrompt(type: string, userPrompt: string): string {
    // Prompts remain the same as your requirements
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
        return userPrompt;
    }
  }

  async generateContent(
    prompt: string,
    type: string,
    image?: Express.Multer.File,
  ): Promise<string> {
    const enhancedPrompt = this.getEnhancedPrompt(type, prompt);
    
    // Construct messages based on presence of image
    const content: any[] = [{ type: 'text', text: enhancedPrompt }];

    if (image) {
      const base64Image = image.buffer.toString('base64');
      content.push({
        type: 'image_url',
        image_url: {
          url: `data:${image.mimetype};base64,${base64Image}`,
        },
      });
    }

    try {
      const chatCompletion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: content,
          },
        ],
        model: this.MODEL_ID,
        temperature: 0.7, // Added for creative but focused social media content
      });

      return chatCompletion.choices[0]?.message?.content || 'No content generated.';
    } catch (error) {
      console.error('Groq AI content generation failed:', error);
      throw new Error(`Failed to get a response from Groq: ${error.message}`);
    }
  }
}