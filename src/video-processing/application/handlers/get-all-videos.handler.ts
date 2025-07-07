import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetAllVideosQuery } from '../queries/get-all-videos.query';
import { Video } from '@app/video-processing/domain/entities/video.entity';
import {
  VideoRepository,
  VIDEO_REPOSITORY,
} from '@app/video-processing/domain/repositories/video.repository';

@QueryHandler(GetAllVideosQuery)
export class GetAllVideosHandler implements IQueryHandler<GetAllVideosQuery> {
  constructor(
    @Inject(VIDEO_REPOSITORY)
    private readonly videoRepository: VideoRepository,
  ) {}

  async execute(query: GetAllVideosQuery): Promise<Video[]> {
    return await this.videoRepository.findAll();
  }
}
