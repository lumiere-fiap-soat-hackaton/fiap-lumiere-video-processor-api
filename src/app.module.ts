import { ConfigurationModule } from '@app/configuration/configuration.module';
import { Module } from '@nestjs/common';
import { Logger } from '@app/common/services/logger';
import { VideoProcessingModule } from '@video-processing/video-processing.module';
import { DynamoDbModule } from './video-processing/infrastructure/database/dynamodb/dynamodb.module';
import { DynamoDbVideoRepository } from './video-processing/infrastructure/repositories/dynamodb-video.repository';
import { VIDEO_REPOSITORY } from './video-processing/domain/repositories/video.repository';

@Module({
  imports: [ConfigurationModule, VideoProcessingModule, DynamoDbModule],
  controllers: [],
  providers: [
    Logger,
    {
      provide: VIDEO_REPOSITORY,
      useClass: DynamoDbVideoRepository,
    },
  ],
})
export class AppModule {}
