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
    const { files, expiresIn } = query;

    const signedUrls = await Promise.all(
      files.map((file) =>
        this.getSignedUrlObject(file.fileName, file.contentType, expiresIn),
      ),
    );

    return new GetSignedUploadUrlOutput(signedUrls);
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
