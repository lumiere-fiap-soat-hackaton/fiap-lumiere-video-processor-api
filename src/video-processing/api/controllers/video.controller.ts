import { GenerateSignedUploadUrlOutput } from '@app/video-processing/application/use-cases/generate-signed-upload-url/generate-signed-upload-url.output';
import { GenerateSignedUploadUrlCommand } from '@app/video-processing/application/use-cases/generate-signed-upload-url/generate-signed-upload-url.command';
import { Body, Controller, HttpCode, Post, Response } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GenerateSignedUploadUrlRequest } from '../dtos/generate-signed-upload-url.request';
import { GenerateSignedDownloadUrlRequest } from '../dtos/generate-signed-download-url.request';
import { GenerateSignedDownloadUrlCommand } from '@app/video-processing/application/use-cases/generate-signed-download-url/generate-signed-download-url.command';
import { GenerateSignedDownloadUrlOutput } from '@app/video-processing/application/use-cases/generate-signed-download-url/generate-signed-download-url.output';

@ApiTags('Video Processings')
@Controller('videos')
export class VideoController {
  private static readonly DEFAULT_URL_EXPIRATION_SECONDS = 300;
  constructor(private readonly commandBus: CommandBus) {}

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
}
