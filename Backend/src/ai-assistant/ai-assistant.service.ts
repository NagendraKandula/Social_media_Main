import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Groq } from 'groq-sdk'; // Ensure groq-sdk is installed via npm
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
    this.groq = new Groq({ apiKey });
  }

  private getEnhancedPrompt(type: string, userPrompt: string, imageCount: number): string {
    const multiInstruction = imageCount > 1 
      ? `I have provided ${imageCount} images. Provide a unique and separate result for EACH image, numbered 1 to ${imageCount}. `
      : '';
    const context = userPrompt ? `Context: "${userPrompt}". ` : '';

    switch (type) {
      case 'Generate Hashtags':
        return `${multiInstruction}${context}Generate 10-15 trending hashtags for EACH image individually. Return only the hashtags.`;
      case 'Generate Description':
        return `${multiInstruction}${context}Write a unique 2-sentence description for EACH image based on its visual content.`;
      case 'Generate Caption':
        return `${multiInstruction}${context}Create one catchy 1-sentence caption for EACH image.`;
      case 'Generate Content':
        return `${multiInstruction}${context}For EACH image, provide a caption followed by relevant hashtags.`;
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
    
    // Correct content structure for Groq Multimodal
    const messageContent: any[] = [{ type: 'text', text: enhancedPrompt }];

    if (images && images.length > 0) {
      // Limit to 5 images as per Llama Maverick constraints
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

    try {
      const chatCompletion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: messageContent }],
        model: this.MODEL_ID,
        temperature: 0.7,
      });

      return chatCompletion.choices[0]?.message?.content || 'No content generated.';
    } catch (error) {
      console.error('Groq AI generation failed:', error);
      throw new Error(`AI generation failed: ${error.message}`);
    }
  }
}