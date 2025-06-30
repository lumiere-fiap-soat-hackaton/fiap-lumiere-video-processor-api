import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class GetSignedDownloadUrlRequest {
  @IsNotEmpty()
  @IsString()
  fileName: string;
}
