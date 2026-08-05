import { Processor, Process } from '@nestjs/bull'; // <-- CHANGED
import { Job, Queue } from 'bull'; // <-- CHANGED
import { Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull'; // <-- CHANGED
import { RenderService } from './render.service';

@Processor('render-queue')
export class RenderProcessor { // <-- Removed WorkerHost
  private readonly logger = new Logger(RenderProcessor.name);

  constructor(
    private readonly renderService: RenderService,
    @InjectQueue('posting-queue') private readonly postingQueue: Queue,
  ) {}

  // <-- ADDED @Process DECORATOR
  @Process('process-media') 
  async handleRender(job: Job<{ postId: number }>): Promise<void> {
    const { postId } = job.data;
    
    this.logger.log(`⚡ Job received: Render Post #${postId}`);

    try {
      // 1. Execute Service
      const result = await this.renderService.processRenderJob(postId);
      
      // 2. Log Result
      this.logger.log(`
      ✅ Render completed for Post #${postId}
      Generated : ${result.generated}
      Reused    : ${result.reused}
      Variants  : ${result.variants}
      `);
      
      // 3. Queue Orchestration: Forward to Posting Queue
      this.logger.log(`📤 Forwarding Post #${postId} to Posting Queue.`);
      await this.postingQueue.add('publish-post', { postId }, {
        removeOnComplete: true,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      });
      
    } catch (error: any) {
      this.logger.error(`❌ Job failed: Render Post #${postId}`, error.stack);
      throw error; 
    }
  }
}