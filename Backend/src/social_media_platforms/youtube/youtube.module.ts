import {Module } from '@nestjs/common';
import {YoutubeController} from './youtube.controller';
import {YoutubeService} from './youtube.service';
import {PrismaModule} from '../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { ConfigModule } from '@nestjs/config';
@Module({
    imports: [PrismaModule,AuthModule,ConfigModule],
    controllers: [YoutubeController],
    providers: [YoutubeService],
    exports: [YoutubeService],
})
export class YoutubeModule {}