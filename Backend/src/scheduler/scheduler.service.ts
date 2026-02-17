import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class SchedulerService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('social-posting') private readonly postingQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkScheduledPosts() {
    const now = new Date();

    // 1. Find due posts
    const posts = await this.prisma.post.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: now },
      },
    });

    for (const post of posts) {
      console.log(`⏰ Scheduled time hit for Post #${post.id}. Moving to Queue.`);

      // 2. Add to Queue
      await this.postingQueue.add('publish-post', { postId: post.id }, {
          attempts: 3,
          backoff: 5000, // Wait 5s before retry
      });

      // 3. Mark as PUBLISHING so we don't pick it up again next minute
      await this.prisma.post.update({
        where: { id: post.id },
        data: { status: 'PUBLISHING' },
      });
    }
  }
}