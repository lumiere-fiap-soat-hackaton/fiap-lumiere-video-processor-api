import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetSignedUploadUrlQuery } from './get-signed-upload-url.query';
import { GetSignedUploadUrlOutput } from './get-signed-upload-url.output';
import { IFileStorageService } from '../../services/file-storage.interface';
import { Inject } from '@nestjs/common';

@QueryHandler(GetSignedUploadUrlQuery)
export class GetSignedUploadUrlHandler
  implements IQueryHandler<GetSignedUploadUrlQuery>
{
  constructor(
    @Inject(IFileStorageService)
    private readonly fileStorageService: IFileStorageService,
  ) {}

  async execute(
    query: GetSignedUploadUrlQuery,
  ): Promise<GetSignedUploadUrlOutput> {
    const { fileName, contentType, expiresIn } = query;

    const signedUrl = await this.fileStorageService.getUploadSignedUrl({
      fileName,
      contentType,
      expiresIn,
    });

    return new GetSignedUploadUrlOutput(signedUrl);
  }
}
