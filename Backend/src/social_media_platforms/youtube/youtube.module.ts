import {Module } from '@nestjs/common';
import {YoutubeController} from './youtube.controller';
import {YoutubeService} from './youtube.service';
import {PrismaModule} from '../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
@Module({
    imports: [PrismaModule,AuthModule],
    controllers: [YoutubeController],
    providers: [YoutubeService],
})
export class YoutubeModule {}