import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaService } from '../prisma/prisma.service'; // Adjust path if needed
import { GenerateContentDto } from './dto/generate-content.dto';
import { ChatAiDto } from './dto/chat-ai.dto';

const PLATFORM_LIMITS: Record<string, number> = {
  twitter: 280,
  x: 280,
  threads: 500,
  instagram: 2200,
  linkedin: 3000,
  facebook: 63206,
  youtube: 5000,
};

@Injectable()
export class AiAssistantService {
  private genAI: GoogleGenerativeAI;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured.');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  private recalculateCharacterCounts(parsedJson: any) {
    if (parsedJson.recommendedPlatforms && Array.isArray(parsedJson.recommendedPlatforms)) {
      parsedJson.recommendedPlatforms = parsedJson.recommendedPlatforms.map((post: any) => {
        const platformKey = post.platform.toLowerCase();
        const limit = PLATFORM_LIMITS[platformKey] || 2200;
        const captionLength = post.caption ? post.caption.length : 0;

        return {
          ...post,
          characterCount: captionLength,
          characterLimit: limit,
          isWithinLimit: captionLength <= limit,
          remainingCharacters: limit - captionLength,
        };
      });
    }
    return JSON.stringify(parsedJson);
  }

  async analyzeAndGenerate(
    userId: number,
    dto: GenerateContentDto,
    files: Express.Multer.File[],
  ): Promise<string> {
    // 1. Fetch connected profiles using lowercase `socialAccount`
    // 2. Select `provider` since `platform` does not exist in the schema
    const profiles = await this.prisma.socialAccount.findMany({
      where: { userId },
      select: { provider: true },
    });

    let activePlatforms = profiles.map((p) => p.provider.toLowerCase());

    if (activePlatforms.length === 0 && dto.platforms && dto.platforms.length > 0) {
      activePlatforms = dto.platforms.map((p) => p.toLowerCase());
    } else if (activePlatforms.length === 0) {
      activePlatforms = ['twitter', 'instagram', 'linkedin', 'facebook', 'threads'];
    }

    const platformRulesStr = activePlatforms
      .map((p) => `- ${p.toUpperCase()} (Max character limit: ${PLATFORM_LIMITS[p] || 2200})`)
      .join('\n');

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });

    const { content, tone, language } = dto;

    const systemInstruction = `
You are an expert Social Media Campaign Strategist.
Analyze the provided media files together as a single post or carousel collection.

Generate tailored post recommendations ONLY FOR THESE CONNECTED PLATFORMS:
${platformRulesStr}

### Platform Limit Rules:
1. **Threads**: Conversational, engaging.
2. **LinkedIn**: Professional tone, structured with bullet points, 3-5 relevant hashtags.
3. **Instagram**: Engaging visual caption, emoji-friendly, call-to-action, 5-10 targeted hashtags.
4. **Facebook**: Story-driven, medium length, clear call-to-action.
5. **Twitter/X**: Concise, punchy, strictly under character limits.
6. **YouTube**: Concise video description format.

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
      "platform": "platform name",
      "rating": 5,
      "reason": "Why this platform fits",
      "caption": "Platform-tailored text strictly adhering to character limits",
      "hashtags": ["#tag1", "#tag2"],
      "cta": "Platform-specific call to action"
    }
  ]
}`;

    let userPrompt = `Analyze the attached media.\n`;
    if (content) userPrompt += `Existing text/context: "${content}".\n`;
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
      const jsonText = result.response.text();
      const parsed = JSON.parse(jsonText);
      
      return this.recalculateCharacterCounts(parsed);
    } catch (error: any) {
      throw new Error(`AI generation failed: ${error.message}`);
    }
  }

  async chatWithAnalysis(
    userId: number,
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
- Respect character limits for each platform.
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
    const jsonText = result.response.text();
    const parsed = JSON.parse(jsonText);

    return this.recalculateCharacterCounts(parsed);
  }
}