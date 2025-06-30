import { IFileStorageService } from '@app/video-processing/application/services/file-storage.interface';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class S3StorageService implements IFileStorageService {
  private readonly bucketName: string =
    this.configService.get<string>('s3.bucketName');

  constructor(
    private readonly client: S3Client,
    private readonly configService: ConfigService,
  ) {}

  async getUploadSignedUrl(params: {
    fileName: string;
    contentType: string;
    expiresIn: number;
  }): Promise<string> {
    const { fileName, contentType, expiresIn } = params;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileName,
      ContentType: contentType,
    });

    const signedUrl = await getSignedUrl(this.client, command, {
      expiresIn,
    });

    return signedUrl;
  }

  async getDownloadSignedUrl(params: {
    fileName: string;
    expiresIn: number;
  }): Promise<string> {
    const { fileName, expiresIn } = params;

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: fileName,
    });

    const signedUrl = await getSignedUrl(this.client, command, {
      expiresIn,
    });

    return signedUrl;
  }
}
