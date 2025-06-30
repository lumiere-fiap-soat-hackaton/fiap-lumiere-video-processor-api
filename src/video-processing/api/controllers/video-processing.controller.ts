import { IFileStorageService } from '@app/video-processing/application/services/file-storage.interface';
import { GetSignedUploadUrlOutput } from '@app/video-processing/application/use-cases/get-signed-upload-url/get-signed-upload-url.output';
import { GetSignedUploadUrlQuery } from '@app/video-processing/application/use-cases/get-signed-upload-url/get-signed-upload-url.query';
import { Controller, Get, Inject, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetSignedUploadUrlRequest } from '../dtos/get-signed-upload-url.dto';
import { GetSignedDownloadUrlRequest } from '../dtos/get-signed-download-url.request';
import { GetSignedDownloadUrlQuery } from '@app/video-processing/application/use-cases/get-signed-download-url/get-signed-download-url.query';
import { GetSignedDownloadUrlOutput } from '@app/video-processing/application/use-cases/get-signed-download-url/get-signed-download-url.output';

@ApiTags('Video Processings')
@Controller('video-processings')
export class VideoProcessingsController {
  private static readonly DEFAULT_URL_EXPIRATION_SECONDS = 300;
  constructor(private readonly querybus: QueryBus) {}

  @Get('upload-signed-url')
  @ApiOperation({
    summary: 'Obtem URL assinada para upload de vídeo',
  })
  async getUploadSignedUrl(
    @Query() { fileName, contentType }: GetSignedUploadUrlRequest,
  ) {
    const query = new GetSignedUploadUrlQuery(
      fileName,
      contentType,
      VideoProcessingsController.DEFAULT_URL_EXPIRATION_SECONDS,
    );

    const output = await this.querybus.execute<
      GetSignedUploadUrlQuery,
      GetSignedUploadUrlOutput
    >(query);
    return output.signedUrl;
  }

  @Get('download-signed-url')
  @ApiOperation({
    summary: 'Obtem URL assinada para download de vídeo',
  })
  async getDownloadSignedUrl(
    @Query() { fileName }: GetSignedDownloadUrlRequest,
  ) {
    const query = new GetSignedDownloadUrlQuery(
      fileName,
      VideoProcessingsController.DEFAULT_URL_EXPIRATION_SECONDS,
    );

    const output = await this.querybus.execute<
      GetSignedDownloadUrlQuery,
      GetSignedDownloadUrlOutput
    >(query);
    return output.signedUrl;
  }
}
