import { GetSignedUploadUrlOutput } from '@app/video-processing/application/use-cases/get-signed-upload-url/get-signed-upload-url.output';
import { GetSignedUploadUrlQuery } from '@app/video-processing/application/use-cases/get-signed-upload-url/get-signed-upload-url.query';
import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetSignedUploadUrlRequest } from '../dtos/get-signed-upload-url.request';
import { GetSignedDownloadUrlRequest } from '../dtos/get-signed-download-url.request';
import { GetSignedDownloadUrlQuery } from '@app/video-processing/application/use-cases/get-signed-download-url/get-signed-download-url.query';
import { GetSignedDownloadUrlOutput } from '@app/video-processing/application/use-cases/get-signed-download-url/get-signed-download-url.output';
import { VideoResponseDto } from '../dtos/video-response.dto';
import { GetAllVideosQuery } from '@app/video-processing/application/use-cases/get-all-videos/get-all-videos.query';
import { GetVideosByUserQuery } from '@app/video-processing/application/use-cases/get-videos-by-user/get-videos-by-user.query';

@ApiTags('Video Processings')
@Controller('videos')
export class VideoController {
  private static readonly DEFAULT_URL_EXPIRATION_SECONDS = 300;
  constructor(private readonly querybus: QueryBus) {}

  @Post('upload-url')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Gera URL assinada para upload de vídeo',
  })
  @ApiBody({ type: [GetSignedUploadUrlRequest] })
  async generateSignedUploadUrl(@Body() files: GetSignedUploadUrlRequest[]) {
    const query = new GetSignedUploadUrlQuery(
      files,
      VideoController.DEFAULT_URL_EXPIRATION_SECONDS,
    );

    const output = await this.querybus.execute<
      GetSignedUploadUrlQuery,
      GetSignedUploadUrlOutput
    >(query);
    return output.signedUrls;
  }

  @Post('download-url')
  @ApiOperation({
    summary: 'Gera URL assinada para download de vídeo',
  })
  async getDownloadUrl(@Body() { fileName }: GetSignedDownloadUrlRequest) {
    const query = new GetSignedDownloadUrlQuery(
      fileName,
      VideoController.DEFAULT_URL_EXPIRATION_SECONDS,
    );

    const output = await this.querybus.execute<
      GetSignedDownloadUrlQuery,
      GetSignedDownloadUrlOutput
    >(query);
    return output.signedUrl;
  }

  @Get()
  @ApiOperation({ summary: 'Get all videos' })
  @ApiResponse({
    status: 200,
    description: 'List of all videos',
    type: [VideoResponseDto],
  })
  async getAllVideos(): Promise<VideoResponseDto[]> {
    return await this.querybus.execute(new GetAllVideosQuery());
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
    return await this.querybus.execute(new GetVideosByUserQuery(userId));
  }
}
