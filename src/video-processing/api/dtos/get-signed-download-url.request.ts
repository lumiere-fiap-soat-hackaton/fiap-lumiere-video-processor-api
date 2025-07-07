import { IsNotEmpty, IsString } from 'class-validator';

export class GetSignedDownloadUrlRequest {
  @IsNotEmpty()
  @IsString()
  fileName: string;
}
