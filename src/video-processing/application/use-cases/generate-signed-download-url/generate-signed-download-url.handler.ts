import { ICommandHandler, CommandHandler } from '@nestjs/cqrs';
import { GenerateSignedDownloadUrlCommand } from './generate-signed-download-url.command';
import { GenerateSignedDownloadUrlOutput } from './generate-signed-download-url.output';
import { IFileStorageService } from '../../services/file-storage.interface';
import { Inject } from '@nestjs/common';

@CommandHandler(GenerateSignedDownloadUrlCommand)
export class GenerateSignedDownloadUrlHandler
  implements ICommandHandler<GenerateSignedDownloadUrlCommand>
{
  constructor(
    @Inject(IFileStorageService)
    private readonly fileStorageService: IFileStorageService,
  ) {}

  async execute(
    command: GenerateSignedDownloadUrlCommand,
  ): Promise<GenerateSignedDownloadUrlOutput> {
    const { fileName, expiresIn } = command;

    const signedUrl = await this.fileStorageService.getDownloadSignedUrl({
      fileName,
      expiresIn,
    });

    return new GenerateSignedDownloadUrlOutput(signedUrl);
  }
}
