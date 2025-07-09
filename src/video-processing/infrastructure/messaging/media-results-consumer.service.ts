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
import { MediaResultApplicationHandler } from '@app/video-processing/application/event-handlers/media-result-application.handler';

@Injectable()
export class MediaResultsConsumerService
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    @Inject(MESSAGE_CONSUMER)
    private readonly messageConsumer: MessageConsumer,
    private readonly mediaResultApplicationHandler: MediaResultApplicationHandler,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.startConsumer();
  }

  onModuleDestroy() {
    this.messageConsumer.stopConsuming();
  }

  private async startConsumer() {
    try {
      const queueKey = this.configService.get<string>('sqs.mediaResultQueue');
      console.log(
        `🚀 Starting MediaResultsConsumerService for queue: ${queueKey}`,
      );

      await this.messageConsumer.startConsuming(
        queueKey,
        this.mediaResultApplicationHandler,
      );
    } catch (error) {
      console.error('❌ Failed to start MediaResultsConsumerService:', error);
    }
  }
}
