import { Module } from '@nestjs/common';
import { VideoProcessingsController } from '@video-processing/api/controllers/video-processing.controller';

@Module({
  imports: [],
  providers: [],
  controllers: [VideoProcessingsController],
})
export class VideoProcessingModule {}
