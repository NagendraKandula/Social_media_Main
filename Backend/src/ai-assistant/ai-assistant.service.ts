 // Best model for fast, multimodal tasks
// Backend/src/ai-assistant/ai-assistant.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
async chatWithAnalysis(
  dto: ChatAiDto,
  files: Express.Multer.File[],
): Promise<any> {

  const model = this.genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.7,
    },
  });

  const prompt = `
You are continuing an existing AI conversation.

Current AI Analysis:

${JSON.stringify(dto.currentAnalysis)}

User Request:

"${dto.instruction}"

Rules:

- Modify ONLY what the user requested.
- Preserve all other fields.
- Return exactly the same JSON structure.
- Return JSON only.
`;

  const promptParts: any[] = [prompt];

  if (files?.length) {
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
  async analyzeAndGenerate(dto: any, files: Express.Multer.File[]): Promise<any> {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
    });

    const { content, platforms, tone, language } = dto;

    const systemInstruction = `
    You are an expert Social Media Campaign Strategist. 
    You will be provided with one or more media files (images/videos). 
    You MUST analyze all provided media TOGETHER as a single cohesive post or carousel. 
    Identify if they form a sequence, a before/after, a product showcase, or a thematic collection.
    
    Return ONLY a JSON object with this EXACT structure:
    {
      "analysis": {
        "mediaSummary": [
          { "index": 1, "type": "IMAGE", "description": "Brief description of the first image" }
        ],
        "overallTheme": "e.g., Fantasy Adventure, Professional Meeting",
        "story": "How these images work together to tell a story or convey a message.",
        "recommendedPlatforms": [
          { "platform": "Instagram", "rating": 5, "reason": "Why this platform is ideal" },
          { "platform": "LinkedIn", "rating": 1, "reason": "Why this platform is not recommended" }
        ],
        "bestAspectRatio": "e.g., 4:5, 1:1, 16:9",
        "engagementPrediction": "High, Medium, or Low",
        "bestPostingTime": "e.g., 7:00 PM - 9:00 PM"
      },
      "content": {
        "caption": "A highly engaging caption for the entire post/carousel.",
        "hashtags": ["#tag1", "#tag2"],
        "cta": "A strong call to action",
        "emoji": ["✨", "🚀"]
      }
    }`;

    let userPrompt = `Analyze the attached media.\n`;
    if (content) userPrompt += `Existing context/text: "${content}".\n`;
    if (tone) userPrompt += `Desired tone: ${tone}.\n`;
    if (language) userPrompt += `Output language: ${language}.\n`;

    const promptParts: any[] = [systemInstruction, userPrompt];
    
    // Append all media files in order
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
      //console.log(result);
//console.log(typeof result);
      return result.response.text();
    } catch (error: any) {
      throw new Error(`AI generation failed: ${error.message}`);
    }
  }
}
