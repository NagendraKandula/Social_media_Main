import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GenerateContentDto } from './dto/generate-content.dto';
import { ChatAiDto } from './dto/chat-ai.dto';

@Injectable()
export class AiAssistantService {
  private genAI: GoogleGenerativeAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured.');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async analyzeAndGenerate(
    dto: GenerateContentDto,
    files: Express.Multer.File[],
  ): Promise<string> {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });

    const { content, platforms, tone, language } = dto;

    const systemInstruction = `
You are an expert Social Media Campaign Strategist.
Analyze the provided media files together as a single post or carousel collection.

Generate tailored post recommendations FOR EACH target or recommended platform.

### Platform Limit Rules:
1. **Twitter / X**: Max 280 characters total. Concise, punchy, 1-2 hashtags max.
2. **Threads**: Max 500 characters. Conversational, engaging.
3. **LinkedIn**: Professional tone, structured with bullet points, 3-5 relevant hashtags.
4. **Instagram**: Engaging visual caption, emoji-friendly, call-to-action, 5-10 targeted hashtags.
5. **Facebook**: Story-driven, medium length, clear call-to-action.
6. **YouTube**: Concise video description format with timestamp placeholders if applicable.

### Strict JSON Output Schema:
Return ONLY a JSON object matching this structure:
{
  "analysis": {
    "mediaSummary": [
      { "index": 1, "type": "IMAGE", "description": "Brief description" }
    ],
    "overallTheme": "Theme summary",
    "story": "Cohesive story behind the media",
    "bestAspectRatio": "e.g., 4:5, 1:1, 16:9",
    "engagementPrediction": "High, Medium, or Low",
    "bestPostingTime": "e.g., 6:00 PM - 8:00 PM"
  },
  "recommendedPlatforms": [
    {
      "platform": "Twitter | LinkedIn | Instagram | Facebook | Threads | YouTube",
      "rating": 5,
      "reason": "Why this platform fits or doesn't fit the media",
      "caption": "Platform-tailored text strictly adhering to character limits",
      "hashtags": ["#tag1", "#tag2"],
      "cta": "Platform-specific call to action"
    }
  ]
}`;

    let userPrompt = `Analyze the attached media.\n`;
    if (content) userPrompt += `Existing text/context: "${content}".\n`;
    if (platforms && platforms.length > 0) {
      userPrompt += `Target platforms requested: ${platforms.join(', ')}.\n`;
    }
    if (tone) userPrompt += `Desired tone: ${tone}.\n`;
    if (language) userPrompt += `Output language: ${language}.\n`;

    const promptParts: any[] = [systemInstruction, userPrompt];

    if (files && files.length > 0) {
      files.forEach((file) => {
        promptParts.push({
          inlineData: {
            data: file.buffer.toString('base64'),
            mimeType: file.mimetype,
          },
        });
      });
    }

    try {
      const result = await model.generateContent(promptParts);
      return result.response.text();
    } catch (error: any) {
      throw new Error(`AI generation failed: ${error.message}`);
    }
  }

  async chatWithAnalysis(
    dto: ChatAiDto,
    files: Express.Multer.File[],
  ): Promise<string> {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });

    const prompt = `
You are continuing an existing AI content generation conversation.

Current AI Analysis and Platform Recommendations:
${JSON.stringify(dto.currentAnalysis)}

User Instruction:
"${dto.instruction}"

Rules:
- Modify ONLY what the user explicitly requested.
- Respect character limits for each platform (e.g., Twitter <= 280 chars).
- Preserve all other fields in the JSON structure.
- Return raw JSON only.
`;

    const promptParts: any[] = [prompt];

    if (files && files.length > 0) {
      files.forEach((file) => {
        promptParts.push({
          inlineData: {
            data: file.buffer.toString('base64'),
            mimeType: file.mimetype,
          },
        });
      });
    }

    const result = await model.generateContent(promptParts);
    return result.response.text();
  }
}