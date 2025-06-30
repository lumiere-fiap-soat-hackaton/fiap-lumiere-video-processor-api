import { Module } from '@nestjs/common';
import { VideoProcessingsController } from '@video-processing/api/controllers/video-processing.controller';
import { IFileStorageService } from './application/services/file-storage.interface';
import { S3StorageService } from './infrastructure/s3-storage/storage.service';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { GetSignedUploadUrlHandler } from './application/use-cases/get-signed-upload-url/get-signed-upload-url.handler';
import { GetSignedDownloadUrlHandler } from './application/use-cases/get-signed-download-url/get-signed-download-url.handler';
import { CqrsModule } from '@nestjs/cqrs';

const useCaseHandlers = [
  GetSignedUploadUrlHandler,
  GetSignedDownloadUrlHandler,
];

@Module({
  imports: [CqrsModule],
  providers: [
    {
      provide: IFileStorageService,
      useFactory: (configService: ConfigService) => {
        const s3Client = new S3Client({
          region: configService.get<string>('aws.region'),
          credentials: {
            accessKeyId: configService.get<string>('aws.accessKeyId'),
            secretAccessKey: configService.get<string>('aws.secretAccessKey'),
          },
        });
        return new S3StorageService(s3Client, configService);
      },
      inject: [ConfigService],
    },
    ...useCaseHandlers,
  ],
  controllers: [VideoProcessingsController],
})
export class VideoProcessingModule {}
