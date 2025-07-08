import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { VideoController } from '@app/video-processing/api/controllers/video.controller';
import { GenerateSignedUploadUrlRequest } from '@app/video-processing/api/dtos/generate-signed-upload-url.request';
import { GenerateSignedDownloadUrlRequest } from '@app/video-processing/api/dtos/generate-signed-download-url.request';
import { GenerateSignedUploadUrlOutput } from '@app/video-processing/application/use-cases/generate-signed-upload-url/generate-signed-upload-url.output';
import { GenerateSignedDownloadUrlOutput } from '@app/video-processing/application/use-cases/generate-signed-download-url/generate-signed-download-url.output';
import { mock, MockProxy } from 'jest-mock-extended';

describe('VideoController - BDD Tests', () => {
  let controller: VideoController;
  let commandBus: MockProxy<CommandBus>;

  beforeEach(async () => {
    commandBus = mock<CommandBus>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VideoController],
      providers: [
        {
          provide: CommandBus,
          useValue: commandBus,
        },
      ],
    }).compile();

    controller = module.get<VideoController>(VideoController);
  });

  describe('Given a user wants to upload video files', () => {
    describe('When requesting signed upload URLs for a single file', () => {
      it('Then should return a valid signed upload URL', async () => {
        // Given
        const files: GenerateSignedUploadUrlRequest[] = [
          {
            fileName: 'video.mp4',
            contentType: 'video/mp4',
          },
        ];

        const mockOutput = new GenerateSignedUploadUrlOutput([
          {
            fileName: 'video.mp4',
            signedUrl: 'https://s3.amazonaws.com/bucket/video.mp4?signature',
          },
        ]);

        commandBus.execute.mockResolvedValue(mockOutput);

        // When
        const result = await controller.generateSignedUploadUrl(files);

        // Then
        expect(result).toBeDefined();
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          fileName: 'video.mp4',
          signedUrl: 'https://s3.amazonaws.com/bucket/video.mp4?signature',
        });
        expect(commandBus.execute).toHaveBeenCalledTimes(1);
      });
    });

    describe('When requesting signed upload URLs for multiple files', () => {
      it('Then should return valid signed upload URLs for all files', async () => {
        // Given
        const files: GenerateSignedUploadUrlRequest[] = [
          {
            fileName: 'video1.mp4',
            contentType: 'video/mp4',
          },
          {
            fileName: 'video2.avi',
            contentType: 'video/avi',
          },
        ];

        const mockOutput = new GenerateSignedUploadUrlOutput([
          {
            fileName: 'video1.mp4',
            signedUrl: 'https://s3.amazonaws.com/bucket/video1.mp4?signature1',
          },
          {
            fileName: 'video2.avi',
            signedUrl: 'https://s3.amazonaws.com/bucket/video2.avi?signature2',
          },
        ]);

        commandBus.execute.mockResolvedValue(mockOutput);

        // When
        const result = await controller.generateSignedUploadUrl(files);

        // Then
        expect(result).toBeDefined();
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
          fileName: 'video1.mp4',
          signedUrl: 'https://s3.amazonaws.com/bucket/video1.mp4?signature1',
        });
        expect(result[1]).toEqual({
          fileName: 'video2.avi',
          signedUrl: 'https://s3.amazonaws.com/bucket/video2.avi?signature2',
        });
        expect(commandBus.execute).toHaveBeenCalledTimes(1);
      });
    });

    describe('When the command bus throws an error', () => {
      it('Then should propagate the error', async () => {
        // Given
        const files: GenerateSignedUploadUrlRequest[] = [
          {
            fileName: 'video.mp4',
            contentType: 'video/mp4',
          },
        ];

        const error = new Error('Command execution failed');
        commandBus.execute.mockRejectedValue(error);

        // When & Then
        await expect(controller.generateSignedUploadUrl(files)).rejects.toThrow(
          'Command execution failed',
        );
      });
    });
  });

  describe('Given a user wants to download a video file', () => {
    describe('When requesting a signed download URL', () => {
      it('Then should return a valid signed download URL', async () => {
        // Given
        const request: GenerateSignedDownloadUrlRequest = {
          fileName: 'video.mp4',
        };

        const mockOutput = new GenerateSignedDownloadUrlOutput(
          'https://s3.amazonaws.com/bucket/video.mp4?signature',
        );

        commandBus.execute.mockResolvedValue(mockOutput);

        // When
        const result = await controller.getDownloadUrl(request);

        // Then
        expect(result).toBeDefined();
        expect(result).toEqual({
          fileName: 'video.mp4',
          signedUrl: 'https://s3.amazonaws.com/bucket/video.mp4?signature',
        });
        expect(commandBus.execute).toHaveBeenCalledTimes(1);
      });
    });

    describe('When the command bus throws an error', () => {
      it('Then should propagate the error', async () => {
        // Given
        const request: GenerateSignedDownloadUrlRequest = {
          fileName: 'nonexistent.mp4',
        };

        const error = new Error('File not found');
        commandBus.execute.mockRejectedValue(error);

        // When & Then
        await expect(controller.getDownloadUrl(request)).rejects.toThrow(
          'File not found',
        );
      });
    });
  });

  describe('Given the controller configuration', () => {
    describe('When checking default URL expiration', () => {
      it('Then should use 300 seconds as default expiration', () => {
        // This tests the static property exists and has the correct value
        // The actual usage is tested through the command execution
        expect(VideoController['DEFAULT_URL_EXPIRATION_SECONDS']).toBe(300);
      });
    });
  });
});
