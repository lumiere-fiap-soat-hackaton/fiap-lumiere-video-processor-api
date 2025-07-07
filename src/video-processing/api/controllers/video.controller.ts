import { GetSignedUploadUrlOutput } from '@app/video-processing/application/use-cases/get-signed-upload-url/get-signed-upload-url.output';
import { GetSignedUploadUrlQuery } from '@app/video-processing/application/use-cases/get-signed-upload-url/get-signed-upload-url.query';
import { Body, Controller, HttpCode, Post, Response } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetSignedUploadUrlRequest } from '../dtos/get-signed-upload-url.request';
import { GetSignedDownloadUrlRequest } from '../dtos/get-signed-download-url.request';
import { GetSignedDownloadUrlQuery } from '@app/video-processing/application/use-cases/get-signed-download-url/get-signed-download-url.query';
import { GetSignedDownloadUrlOutput } from '@app/video-processing/application/use-cases/get-signed-download-url/get-signed-download-url.output';

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
}
