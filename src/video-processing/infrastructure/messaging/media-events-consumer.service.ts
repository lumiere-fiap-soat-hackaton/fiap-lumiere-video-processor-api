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
import { MediaEventHandler } from '@app/video-processing/domain/services/media-event-handler.service';

@Injectable()
export class MediaEventsConsumerService
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    @Inject(MESSAGE_CONSUMER)
    private readonly messageConsumer: MessageConsumer,
    private readonly mediaEventHandler: MediaEventHandler,
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
        this.mediaEventHandler,
      );
    } catch (error) {
      console.error('❌ Failed to start MediaEventsConsumerService:', error);
    }
  }
}
