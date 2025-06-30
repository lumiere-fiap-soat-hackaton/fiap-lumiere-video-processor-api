import { Module } from '@nestjs/common';
import { VideoProcessingsController } from './api/controllers/video-processing.controller';
import { DynamoDbModule } from './infrastructure/database/dynamodb/dynamodb.module';
import { DynamoDbVideoRepository } from './infrastructure/repositories/dynamodb-video.repository';
import { VIDEO_REPOSITORY } from './domain/repositories/video.repository';

@Module({
  imports: [DynamoDbModule],
  providers: [
    {
      provide: VIDEO_REPOSITORY,
      useClass: DynamoDbVideoRepository,
    },
  ],
  controllers: [VideoProcessingsController],
  exports: [VIDEO_REPOSITORY],
})
export class VideoProcessingModule {}
