import { Module } from '@nestjs/common';
import { DynamoDbModule } from './infrastructure/database/dynamodb/dynamodb.module';
import { SqsModule } from './infrastructure/messaging/sqs/sqs.module';
import { DynamoDbVideoRepository } from './infrastructure/repositories/dynamodb-video.repository';
import { SqsMessagePublisher } from './infrastructure/messaging/sqs/sqs-message-publisher';
import { SqsMessageConsumer } from './infrastructure/messaging/sqs/sqs-message-consumer';
import {
  ProcessMediaFileHandler,
  UpdateVideoStatusHandler,
} from './application/commands/video.handlers';
import { MediaEventApplicationHandler } from './application/event-handlers/media-event-application.handler';
import { MediaResultApplicationHandler } from './application/event-handlers/media-result-application.handler';

import { MediaEventsConsumerService } from './infrastructure/messaging/media-events-consumer.service';
import { MediaResultsConsumerService } from './infrastructure/messaging/media-results-consumer.service';
import { VIDEO_REPOSITORY } from './domain/repositories/video.repository';
import { MESSAGE_PUBLISHER } from './domain/messaging/message-publisher.interface';
import { MESSAGE_CONSUMER } from './domain/messaging/message-consumer.interface';
import { VideoController } from '@app/video-processing/api/controllers/video.controller';
import { IFileStorageService } from './application/services/file-storage.interface';
import { S3StorageService } from './infrastructure/s3-storage/storage.service';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { GenerateSignedUploadUrlHandler } from './application/use-cases/generate-signed-upload-url/generate-signed-upload-url.handler';
import { GenerateSignedDownloadUrlHandler } from './application/use-cases/generate-signed-download-url/generate-signed-download-url.handler';
import { CqrsModule } from '@nestjs/cqrs';
import { GetAllVideosHandler } from './application/use-cases/get-all-videos/get-all-videos.handler';
import { GetVideosByUserHandler } from './application/use-cases/get-videos-by-user/get-videos-by-user.handler';

const useCaseHandlers = [
  GetAllVideosHandler,
  GetVideosByUserHandler,
  GenerateSignedUploadUrlHandler,
  GenerateSignedDownloadUrlHandler,
];

const commandHandlers = [ProcessMediaFileHandler, UpdateVideoStatusHandler];

const eventHandlers = [
  MediaEventApplicationHandler,
  MediaResultApplicationHandler,
];

@Module({
  imports: [CqrsModule, DynamoDbModule, SqsModule],
  providers: [
    {
      provide: IFileStorageService,
      useFactory: (configService: ConfigService) => {
        const s3Client = new S3Client({
          region: configService.get<string>('aws.region'),
          credentials: {
            accessKeyId: configService.get<string>('aws.accessKeyId'),
            secretAccessKey: configService.get<string>('aws.secretAccessKey'),
          },
        });
        return new S3StorageService(s3Client, configService);
      },
      inject: [ConfigService],
    },
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

    // Consumer Services (Auto-start)
    MediaEventsConsumerService,
    MediaResultsConsumerService,

    ...commandHandlers,
    ...eventHandlers,
    ...useCaseHandlers,
  ],
  controllers: [VideoController],
  exports: [VIDEO_REPOSITORY, MESSAGE_PUBLISHER, MESSAGE_CONSUMER],
})
export class VideoProcessingModule {}
