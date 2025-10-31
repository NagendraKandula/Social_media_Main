import { Module } from '@nestjs/common';
import { InstagramBusinessController } from './instagram-business.controller';
import { InstagramBusinessService } from './instagram-business.service';
import { HttpModule } from '@nestjs/axios';

@Module({
    imports: [HttpModule],
    controllers: [InstagramBusinessController],
    providers: [InstagramBusinessService],
    exports: [InstagramBusinessService],
})
export class InstagramBusinessModule {}