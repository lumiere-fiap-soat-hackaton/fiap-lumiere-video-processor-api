import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { VideoResponseDto } from '../dtos/video-response.dto';
import { GetAllVideosQuery } from '@app/video-processing/application/use-cases/get-all-videos/get-all-videos.query';
import { GetVideosByUserQuery } from '@app/video-processing/application/use-cases/get-videos-by-user/get-videos-by-user.query';
import { GetVideosByStatusQuery } from '@app/video-processing/application/use-cases/get-videos-by-status/get-videos-by-status.query';
import { GenerateSignedUploadUrlOutput } from '@app/video-processing/application/use-cases/generate-signed-upload-url/generate-signed-upload-url.output';
import { GenerateSignedUploadUrlCommand } from '@app/video-processing/application/use-cases/generate-signed-upload-url/generate-signed-upload-url.command';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { GenerateSignedUploadUrlRequest } from '../dtos/generate-signed-upload-url.request';
import { GenerateSignedDownloadUrlRequest } from '../dtos/generate-signed-download-url.request';
import { GenerateSignedDownloadUrlCommand } from '@app/video-processing/application/use-cases/generate-signed-download-url/generate-signed-download-url.command';
import { GenerateSignedDownloadUrlOutput } from '@app/video-processing/application/use-cases/generate-signed-download-url/generate-signed-download-url.output';
import {
  Video,
  VideoStatus,
} from '@app/video-processing/domain/entities/video.entity';

@ApiTags('Video Processings')
@Controller('videos')
export class VideoController {
  private static readonly DEFAULT_URL_EXPIRATION_SECONDS = 300;
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('upload-url')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Gera URL assinada para upload de vídeo',
  })
  @ApiBody({ type: [GenerateSignedUploadUrlRequest] })
  async generateSignedUploadUrl(
    @Body() files: GenerateSignedUploadUrlRequest[],
  ) {
    const command = new GenerateSignedUploadUrlCommand(
      files,
      VideoController.DEFAULT_URL_EXPIRATION_SECONDS,
    );

    const output = await this.commandBus.execute<
      GenerateSignedUploadUrlCommand,
      GenerateSignedUploadUrlOutput
    >(command);
    return output.signedUrls;
  }

  @Post('download-url')
  @ApiOperation({
    summary: 'Gera URL assinada para download de vídeo',
  })
  async getDownloadUrl(@Body() { fileName }: GenerateSignedDownloadUrlRequest) {
    const command = new GenerateSignedDownloadUrlCommand(
      fileName,
      VideoController.DEFAULT_URL_EXPIRATION_SECONDS,
    );

    const output = await this.commandBus.execute<
      GenerateSignedDownloadUrlCommand,
      GenerateSignedDownloadUrlOutput
    >(command);
    return { fileName, signedUrl: output.signedUrl };
  }

  @Get()
  @ApiOperation({
    summary: 'Busca todos os vídeos',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de todos os vídeos',
    type: [VideoResponseDto],
  })
  async getAllVideos(): Promise<Video[]> {
    const query = new GetAllVideosQuery();
    return await this.queryBus.execute<GetAllVideosQuery, Video[]>(query);
  }

  @Get('status/:status')
  @ApiOperation({
    summary: 'Busca vídeos por status',
  })
  @ApiParam({
    name: 'status',
    description: 'Status do vídeo',
    type: 'string',
    enum: Object.values(VideoStatus),
    example: VideoStatus.COMPLETED,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de vídeos com o status especificado',
    type: [VideoResponseDto],
  })
  async getVideosByStatus(@Param('status') status: string): Promise<Video[]> {
    const query = new GetVideosByStatusQuery(status);
    return await this.queryBus.execute<GetVideosByStatusQuery, Video[]>(query);
  }

  @Get('user/:userId')
  @ApiOperation({
    summary: 'Busca vídeos por usuário',
  })
  @ApiParam({
    name: 'userId',
    description: 'ID do usuário',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de vídeos do usuário',
    type: [VideoResponseDto],
  })
  async getVideosByUser(@Param('userId') userId: string): Promise<Video[]> {
    const query = new GetVideosByUserQuery(userId);
    return await this.queryBus.execute<GetVideosByUserQuery, Video[]>(query);
  }
}
