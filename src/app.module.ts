import { ConfigurationModule } from '@app/configuration/configuration.module';
import { Module } from '@nestjs/common';
import { Logger } from '@app/common/services/logger';
import { VideoProcessingModule } from '@video-processing/video-processing.module';

@Module({
  imports: [ConfigurationModule, VideoProcessingModule],
  controllers: [],
  providers: [Logger],
})
export class AppModule {}
