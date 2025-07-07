import { ConfigurationModule } from '@app/configuration/configuration.module';
import { Module } from '@nestjs/common';
import { Logger } from '@app/common/services/logger';
import { VideoProcessingModule } from '@video-processing/video-processing.module';
import { CqrsModule } from '@nestjs/cqrs';

@Module({
  imports: [ConfigurationModule, VideoProcessingModule],
  controllers: [],
  providers: [Logger],
})
export class AppModule {}
