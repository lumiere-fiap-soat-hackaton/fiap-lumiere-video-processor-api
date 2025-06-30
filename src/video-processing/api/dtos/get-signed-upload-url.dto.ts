import { IsString, IsMimeType } from 'class-validator';

export class GetSignedUploadUrlRequest {
  @IsString()
  fileName: string;

  @IsMimeType()
  contentType: string;
}
