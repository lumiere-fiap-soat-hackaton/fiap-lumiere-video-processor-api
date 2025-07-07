import { Controller, Get, Param } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { GetVideosByUserQuery } from '@app/video-processing/application/queries/get-videos-by-user.query';
import { GetAllVideosQuery } from '@app/video-processing/application/queries/get-all-videos.query';
import { VideoResponseDto } from '@app/video-processing/api/dtos/video-response.dto';

@ApiTags('video-processings')
@Controller('video-processings')
export class VideoProcessingsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @ApiOperation({ summary: 'Get all videos' })
  @ApiResponse({
    status: 200,
    description: 'List of all videos',
    type: [VideoResponseDto],
  })
  async getAllVideos(): Promise<VideoResponseDto[]> {
    return this.queryBus.execute(new GetAllVideosQuery());
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get videos by user ID' })
  @ApiParam({
    name: 'userId',
    description: 'User UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'List of videos for the user',
    type: [VideoResponseDto],
  })
  async getVideosByUserId(
    @Param('userId') userId: string,
  ): Promise<VideoResponseDto[]> {
    return this.queryBus.execute(new GetVideosByUserQuery(userId));
  }
}
