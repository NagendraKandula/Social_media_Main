import { Controller, Get, Req, Res, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';

// Define the shape of the access token response (OIDC)
interface LinkedInTokenResponse {
  access_token: string;
  id_token?: string; // OIDC token
}

@Injectable()
@Controller('auth/linkedin')
export class LinkedinStrategy {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  initiateLogin(@Res() res: Response) {
    const clientId = this.configService.get<string>('LINKEDIN_CLIENT_ID')!;
    const redirectUri = this.configService.get<string>('LINKEDIN_REDIRECT_URI')!;

    // ✅ Use OIDC-style scopes
    const scope = 'openid profile email w_member_social';

    const linkedinAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&scope=${encodeURIComponent(scope)}`;

    res.redirect(linkedinAuthUrl);
  }

  @Get('callback')
async handleCallback(@Req() req: Request, @Res() res: Response) {
  const code = req.query.code as string;
  const frontendUrl = this.configService.get<string>('FRONTEND_URL')!;
  if (!code) {
    return res.redirect(`${frontendUrl}/login?error=linkedin_denied`);
  }

  try {
    const tokenResponse = await this.getAccessToken(code);

    if (!tokenResponse.id_token) {
      throw new Error('No ID token returned from LinkedIn');
    }

    // Decode ID token to extract user info
    const decoded: any = jwt.decode(tokenResponse.id_token);
    const user = {
      provider: 'linkedin',
      id: decoded.sub,
      firstName: decoded.given_name || decoded.name?.split(' ')[0],
      lastName: decoded.family_name || decoded.name?.split(' ')[1],
      email: decoded.email,
    };

    // Store tokens in HTTP-only cookies
    res.cookie('linkedin_access_token', tokenResponse.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'none',
    });

    res.cookie('linkedin_id_token', tokenResponse.id_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'none',
    });

    const frontendUrl = this.configService.get<string>('FRONTEND_URL')!;
    // Redirect user to frontend
    return res.redirect(`${frontendUrl}/Landing`);
  } catch (error: any) {
    console.error('LinkedIn authentication failed:', error.message);
    return res.redirect(`${frontendUrl}/login?error=linkedin_failed`);
  }
}

  // --- Helper Functions ---

  private async getAccessToken(code: string): Promise<LinkedInTokenResponse> {
    const clientId = this.configService.get<string>('LINKEDIN_CLIENT_ID');
    const clientSecret = this.configService.get<string>('LINKEDIN_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Missing LinkedIn OAuth environment variables');
    }

    const requestBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.configService.get<string>('LINKEDIN_REDIRECT_URI')!,
      client_id: clientId,
      client_secret: clientSecret,
    }).toString();

    const { data } = await axios.post<LinkedInTokenResponse>(
      'https://www.linkedin.com/oauth/v2/accessToken',
      requestBody,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      },
    );

   

    return data;
  }
}
