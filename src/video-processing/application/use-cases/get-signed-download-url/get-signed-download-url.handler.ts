import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetSignedDownloadUrlQuery } from './get-signed-download-url.query';
import { GetSignedDownloadUrlOutput } from './get-signed-download-url.output';
import { IFileStorageService } from '../../services/file-storage.interface';
import { Inject } from '@nestjs/common';
import { FileNotExistsException } from '@app/common/exceptions/file-not-exists.exception';

@QueryHandler(GetSignedDownloadUrlQuery)
export class GetSignedDownloadUrlHandler
  implements IQueryHandler<GetSignedDownloadUrlQuery>
{
  constructor(
    @Inject(IFileStorageService)
    private readonly fileStorageService: IFileStorageService,
  ) {}

  async execute(
    query: GetSignedDownloadUrlQuery,
  ): Promise<GetSignedDownloadUrlOutput> {
    const { fileName, expiresIn } = query;

    const fileExists = await this.fileStorageService.fileExists(fileName);

    if (!fileExists) {
      throw new FileNotExistsException(fileName);
    }

    const signedUrl = await this.fileStorageService.getDownloadSignedUrl({
      fileName,
      expiresIn,
    });

    return new GetSignedDownloadUrlOutput(signedUrl);
  }
}
