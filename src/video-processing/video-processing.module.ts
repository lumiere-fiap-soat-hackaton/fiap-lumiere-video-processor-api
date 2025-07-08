import { Module } from '@nestjs/common';
import { VideoController } from '@app/video-processing/api/controllers/video.controller';
import { IFileStorageService } from './application/services/file-storage.interface';
import { S3StorageService } from './infrastructure/s3-storage/storage.service';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { GenerateSignedUploadUrlHandler } from './application/use-cases/generate-signed-upload-url/generate-signed-upload-url.handler';
import { GenerateSignedDownloadUrlHandler } from './application/use-cases/generate-signed-download-url/generate-signed-download-url.handler';
import { CqrsModule } from '@nestjs/cqrs';

const commandHandlers = [
  GenerateSignedUploadUrlHandler,
  GenerateSignedDownloadUrlHandler,
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
    ...commandHandlers,
  ],
  controllers: [VideoController],
})
export class VideoProcessingModule {}
