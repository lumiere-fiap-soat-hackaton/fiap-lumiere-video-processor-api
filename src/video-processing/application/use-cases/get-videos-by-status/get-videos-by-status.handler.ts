import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetVideosByStatusQuery } from './get-videos-by-status.query';
import { Video } from '@app/video-processing/domain/entities/video.entity';
import {
  VideoRepository,
  VIDEO_REPOSITORY,
} from '@app/video-processing/domain/repositories/video.repository';

@QueryHandler(GetVideosByStatusQuery)
export class GetVideosByStatusHandler
  implements IQueryHandler<GetVideosByStatusQuery>
{
  constructor(
    @Inject(VIDEO_REPOSITORY)
    private readonly videoRepository: VideoRepository,
  ) {}

  async execute(query: GetVideosByStatusQuery): Promise<Video[]> {
    return await this.videoRepository.findByStatus(query.status);
  }
}
