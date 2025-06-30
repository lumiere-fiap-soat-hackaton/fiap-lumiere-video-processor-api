import { IsString } from 'class-validator';

export class GetSignedDownloadUrlRequest {
  @IsString()
  fileName: string;
}
