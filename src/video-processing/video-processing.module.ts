import { Module } from '@nestjs/common';
import { VideoProcessingsController } from './api/controllers/video-processing.controller';
import { DynamoDbModule } from './infrastructure/database/dynamodb/dynamodb.module';
import { SqsModule } from './infrastructure/messaging/sqs/sqs.module';
import { DynamoDbVideoRepository } from './infrastructure/repositories/dynamodb-video.repository';
import { SqsMessagePublisher } from './infrastructure/messaging/sqs/sqs-message-publisher';
import { SqsMessageConsumer } from './infrastructure/messaging/sqs/sqs-message-consumer';
import { MediaEventHandler } from './domain/services/media-event-handler.service';
import { MediaResultHandler } from './domain/services/media-result-handler.service';
import { MediaEventsConsumerService } from './infrastructure/messaging/media-events-consumer.service';
import { MediaResultsConsumerService } from './infrastructure/messaging/media-results-consumer.service';
import { VIDEO_REPOSITORY } from './domain/repositories/video.repository';
import { MESSAGE_PUBLISHER } from './domain/messaging/message-publisher.interface';
import { MESSAGE_CONSUMER } from './domain/messaging/message-consumer.interface';

@Module({
  imports: [DynamoDbModule, SqsModule],
  providers: [
    // Repositories
    {
      provide: VIDEO_REPOSITORY,
      useClass: DynamoDbVideoRepository,
    },

    // Messaging Infrastructure
    {
      provide: MESSAGE_PUBLISHER,
      useClass: SqsMessagePublisher,
    },
    {
      provide: MESSAGE_CONSUMER,
      useClass: SqsMessageConsumer,
    },

    // Domain Services (Handlers)
    MediaEventHandler,
    MediaResultHandler,

    // Consumer Services (Auto-start)
    MediaEventsConsumerService,
    MediaResultsConsumerService,
  ],
  controllers: [VideoProcessingsController],
  exports: [VIDEO_REPOSITORY, MESSAGE_PUBLISHER, MESSAGE_CONSUMER],
})
export class VideoProcessingModule {}
