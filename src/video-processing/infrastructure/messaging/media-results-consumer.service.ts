import {
  Injectable,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MessageConsumer,
  MESSAGE_CONSUMER,
} from '@app/video-processing/domain/messaging/message-consumer.interface';
import { MediaResultHandler } from '@app/video-processing/domain/services/media-result-handler.service';

@Injectable()
export class MediaResultsConsumerService
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    @Inject(MESSAGE_CONSUMER)
    private readonly messageConsumer: MessageConsumer,
    private readonly mediaResultHandler: MediaResultHandler,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const env = this.configService.get<string>('NODE_ENV');

    if (env !== 'test') {
      await this.startConsumer();
    }
  }

  onModuleDestroy() {
    this.messageConsumer.stopConsuming();
  }

  private async startConsumer() {
    try {
      const queueKey = 'MEDIA_RESULT_QUEUE';
      console.log(
        `🚀 Starting MediaResultsConsumerService for queue: ${queueKey}`,
      );

      await this.messageConsumer.startConsuming(
        queueKey,
        this.mediaResultHandler,
      );
    } catch (error) {
      console.error('❌ Failed to start MediaResultsConsumerService:', error);
    }
  }
}
