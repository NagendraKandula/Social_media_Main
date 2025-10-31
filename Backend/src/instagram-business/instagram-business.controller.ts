import { Controller , Get, Query , Res,Post,Body,Req,UseGuards, } from '@nestjs/common';
import { InstagramBusinessService } from './instagram-business.service';
import { Response,Request } from 'express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

class InstagramPostDto{
    caption: string;
    imageUrl: string;
}
let TEMP_IG_TOKEN: string | null = null;
let TEMP_IG_USER: string | null = null;

@Controller('instagram-business')
export class InstagramBusinessController {
    constructor(private readonly instagramBusinessService: InstagramBusinessService) {}     
    @Get('callback')
    async instagramBusinessCallback(
        @Query('code') code: string,
        @Res() res: Response,
    ) {
        if(!code){
            return res.redirect('http://localhost:3000/login?error= true');
        }
        try{
            const tokens = await this.instagramBusinessService.handleInstagramCallback(code);
            console.log('Access Token:', tokens);
            TEMP_IG_TOKEN = tokens.accessToken;
            TEMP_IG_USER = tokens.userId;
             // Set tokens in secure, HttpOnly cookies
            res.cookie('ig_access_token', tokens.accessToken, {
                  httpOnly: true,
                   secure: true,
                   sameSite: 'none',
      });
       res.cookie('ig_user_id', tokens.userId, {
                     httpOnly: true,
                     secure: true,
                     sameSite: 'none',
      });
            return res. redirect('http://localhost:3000/instagram-business-post');
        }
        catch (error) {
            console.error('Error handling Instagram callback:', error);
            return res.redirect('http://localhost:3000/login?error= true');
        }
    }
    @UseGuards(JwtAuthGuard)
    @Post('post')
    async postToInstagram(
    @Res() res: Response,
    @Req() req: Request,
    @Body() postDto:InstagramPostDto,) {
    const accessToken = TEMP_IG_TOKEN || req.cookies['ig_access_token'];
    const userId = TEMP_IG_USER|| req.cookies['ig_user_id'];
    if (!accessToken || !userId) {
      return res.status(401).json({ message: 'Instagram not connected.' });
    }
    return this.instagramBusinessService.postToInstagram(
        accessToken,
        userId,
        postDto.caption,
        postDto.imageUrl,
      );
}
 } //@Query('state') state: string,