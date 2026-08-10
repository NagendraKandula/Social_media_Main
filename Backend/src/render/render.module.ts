import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull'; // <-- CHANGED
import { RenderService } from './render.service';
import { RenderProcessor } from './render.processor';
import { RenderHelper } from './render.helper';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageService } from '../storage/storage.service';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: 'render-queue' }),
    BullModule.registerQueue({ name: 'posting-queue' }),
  ],
  providers: [RenderService, RenderProcessor, RenderHelper, StorageService],
  exports: [RenderService, RenderHelper],
})
export class RenderModule {}