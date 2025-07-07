import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetVideosByUserQuery } from '../queries/get-videos-by-user.query';
import { Video } from '@app/video-processing/domain/entities/video.entity';
import {
  VideoRepository,
  VIDEO_REPOSITORY,
} from '@app/video-processing/domain/repositories/video.repository';

@QueryHandler(GetVideosByUserQuery)
export class GetVideosByUserHandler
  implements IQueryHandler<GetVideosByUserQuery>
{
  constructor(
    @Inject(VIDEO_REPOSITORY)
    private readonly videoRepository: VideoRepository,
  ) {}

  async execute(query: GetVideosByUserQuery): Promise<Video[]> {
    return await this.videoRepository.findByUserId(query.userId);
  }
}
