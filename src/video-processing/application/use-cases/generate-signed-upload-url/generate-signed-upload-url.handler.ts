import { ICommandHandler, CommandHandler } from '@nestjs/cqrs';
import { GenerateSignedUploadUrlCommand } from './generate-signed-upload-url.command';
import { GenerateSignedUploadUrlOutput } from './generate-signed-upload-url.output';
import { IFileStorageService } from '../../services/file-storage.interface';
import { Inject } from '@nestjs/common';

@CommandHandler(GenerateSignedUploadUrlCommand)
export class GenerateSignedUploadUrlHandler
  implements ICommandHandler<GenerateSignedUploadUrlCommand>
{
  constructor(
    @Inject(IFileStorageService)
    private readonly fileStorageService: IFileStorageService,
  ) {}

  async execute(
    command: GenerateSignedUploadUrlCommand,
  ): Promise<GenerateSignedUploadUrlOutput> {
    const { userId, files, expiresIn } = command;

    const signedUrls = await Promise.all(
      files.map((file) =>
        this.getSignedUrlObject(
          `${userId}--${file.fileName}`,
          file.contentType,
          expiresIn,
        ),
      ),
    );

    return new GenerateSignedUploadUrlOutput(signedUrls);
  }

  private async getSignedUrlObject(
    fileName: string,
    contentType: string,
    expiresIn: number,
  ): Promise<{ fileName: string; signedUrl: string }> {
    const url = await this.fileStorageService.getUploadSignedUrl({
      fileName,
      contentType,
      expiresIn,
    });

    return { fileName, signedUrl: url };
  }
}
