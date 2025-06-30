import { IsString, IsMimeType, Matches, IsNotEmpty } from 'class-validator';

export class GetSignedUploadUrlRequest {
  @IsNotEmpty()
  @IsString()
  fileName: string;

  @IsNotEmpty()
  @IsMimeType()
  contentType: string;
}
