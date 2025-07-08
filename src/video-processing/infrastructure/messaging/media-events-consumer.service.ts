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
import { MediaEventApplicationHandler } from '@app/video-processing/application/event-handlers/media-event-application.handler';

@Injectable()
export class MediaEventsConsumerService
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    @Inject(MESSAGE_CONSUMER)
    private readonly messageConsumer: MessageConsumer,
    private readonly mediaEventApplicationHandler: MediaEventApplicationHandler,
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
      const queueKey = this.configService.get<string>('sqs.mediaEventsQueue');
      console.log(
        `🚀 Starting MediaEventsConsumerService for queue: ${queueKey}`,
      );

      await this.messageConsumer.startConsuming(
        queueKey,
        this.mediaEventApplicationHandler,
      );
    } catch (error) {
      console.error('❌ Failed to start MediaEventsConsumerService:', error);
    }
  }
}
