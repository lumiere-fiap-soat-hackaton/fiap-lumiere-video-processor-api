import { Test, TestingModule } from '@nestjs/testing';
import { QueryBus } from '@nestjs/cqrs';
import { VideoController } from '@app/video-processing/api/controllers/video.controller';
import { GetSignedUploadUrlRequest } from '@app/video-processing/api/dtos/get-signed-upload-url.request';
import { GetSignedDownloadUrlRequest } from '@app/video-processing/api/dtos/get-signed-download-url.request';
import { GetSignedUploadUrlOutput } from '@app/video-processing/application/use-cases/get-signed-upload-url/get-signed-upload-url.output';
import { GetSignedDownloadUrlOutput } from '@app/video-processing/application/use-cases/get-signed-download-url/get-signed-download-url.output';
import { mock, MockProxy } from 'jest-mock-extended';

describe('VideoController - BDD Tests', () => {
  let controller: VideoController;
  let queryBus: MockProxy<QueryBus>;

  beforeEach(async () => {
    queryBus = mock<QueryBus>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VideoController],
      providers: [
        {
          provide: QueryBus,
          useValue: queryBus,
        },
      ],
    }).compile();

    controller = module.get<VideoController>(VideoController);
  });

  describe('Given a user wants to upload video files', () => {
    describe('When requesting signed upload URLs for a single file', () => {
      it('Then should return a valid signed upload URL', async () => {
        // Given
        const requestFiles: GetSignedUploadUrlRequest[] = [
          {
            fileName: 'test-video.mp4',
            contentType: 'video/mp4',
          },
        ];

        const expectedOutput = new GetSignedUploadUrlOutput([
          {
            fileName: 'test-video.mp4',
            signedUrl:
              'https://s3.amazonaws.com/bucket/test-video.mp4?signature=test',
          },
        ]);

        queryBus.execute.mockResolvedValue(expectedOutput);

        // When
        const result = await controller.generateSignedUploadUrl(requestFiles);

        // Then
        expect(result).toEqual(expectedOutput.signedUrls);
        expect(queryBus.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            files: requestFiles,
            expiresIn: 300,
          }),
        );
        expect(queryBus.execute).toHaveBeenCalledTimes(1);
      });
    });

    describe('When requesting signed upload URLs for multiple files', () => {
      it('Then should return valid signed upload URLs for all files', async () => {
        // Given
        const requestFiles: GetSignedUploadUrlRequest[] = [
          {
            fileName: 'video1.mp4',
            contentType: 'video/mp4',
          },
          {
            fileName: 'video2.mov',
            contentType: 'video/quicktime',
          },
          {
            fileName: 'video3.avi',
            contentType: 'video/x-msvideo',
          },
        ];

        const expectedOutput = new GetSignedUploadUrlOutput([
          {
            fileName: 'video1.mp4',
            signedUrl:
              'https://s3.amazonaws.com/bucket/video1.mp4?signature=test1',
          },
          {
            fileName: 'video2.mov',
            signedUrl:
              'https://s3.amazonaws.com/bucket/video2.mov?signature=test2',
          },
          {
            fileName: 'video3.avi',
            signedUrl:
              'https://s3.amazonaws.com/bucket/video3.avi?signature=test3',
          },
        ]);

        queryBus.execute.mockResolvedValue(expectedOutput);

        // When
        const result = await controller.generateSignedUploadUrl(requestFiles);

        // Then
        expect(result).toEqual(expectedOutput.signedUrls);
        expect(queryBus.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            files: requestFiles,
            expiresIn: 300,
          }),
        );
        expect(queryBus.execute).toHaveBeenCalledTimes(1);
      });
    });

    describe('When requesting upload URLs for an empty file list', () => {
      it('Then should return an empty result', async () => {
        // Given
        const requestFiles: GetSignedUploadUrlRequest[] = [];
        const expectedOutput = new GetSignedUploadUrlOutput([]);

        queryBus.execute.mockResolvedValue(expectedOutput);

        // When
        const result = await controller.generateSignedUploadUrl(requestFiles);

        // Then
        expect(result).toEqual([]);
        expect(queryBus.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            files: [],
            expiresIn: 300,
          }),
        );
      });
    });
  });

  describe('Given the upload URL generation encounters errors', () => {
    describe('When the query bus throws an error', () => {
      it('Then should propagate the error to the caller', async () => {
        // Given
        const requestFiles: GetSignedUploadUrlRequest[] = [
          {
            fileName: 'test-video.mp4',
            contentType: 'video/mp4',
          },
        ];
        const error = new Error('Upload service error');

        queryBus.execute.mockRejectedValue(error);

        // When & Then
        await expect(
          controller.generateSignedUploadUrl(requestFiles),
        ).rejects.toThrow('Upload service error');
      });
    });
  });

  describe('Given a user wants to download a video file', () => {
    describe('When requesting a signed download URL with valid parameters', () => {
      it('Then should return a valid signed download URL', async () => {
        // Given
        const request: GetSignedDownloadUrlRequest = {
          fileName: 'demo-video.mp4',
        };

        const expectedOutput = new GetSignedDownloadUrlOutput(
          'https://s3.amazonaws.com/bucket/demo-video.mp4?X-Amz-Signature=test',
        );

        queryBus.execute.mockResolvedValue(expectedOutput);

        // When
        const result = await controller.getDownloadUrl(request);

        // Then
        expect(result).toBe(expectedOutput.signedUrl);
        expect(queryBus.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            fileName: 'demo-video.mp4',
            expiresIn: 300,
          }),
        );
        expect(queryBus.execute).toHaveBeenCalledTimes(1);
      });
    });

    describe('When requesting download URL for different file types', () => {
      it('Then should handle various video file extensions correctly', async () => {
        // Given
        const request: GetSignedDownloadUrlRequest = {
          fileName: 'presentation.avi',
        };

        const expectedOutput = new GetSignedDownloadUrlOutput(
          'https://s3.amazonaws.com/bucket/presentation.avi?signature=test',
        );

        queryBus.execute.mockResolvedValue(expectedOutput);

        // When
        const result = await controller.getDownloadUrl(request);

        // Then
        expect(result).toBe(expectedOutput.signedUrl);
        expect(queryBus.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            fileName: 'presentation.avi',
            expiresIn: 300,
          }),
        );
      });
    });
  });

  describe('Given the download URL generation encounters errors', () => {
    describe('When the query bus throws an error', () => {
      it('Then should propagate the error to the caller', async () => {
        // Given
        const request: GetSignedDownloadUrlRequest = {
          fileName: 'missing-video.mp4',
        };
        const error = new Error('Download service error');

        queryBus.execute.mockRejectedValue(error);

        // When & Then
        await expect(controller.getDownloadUrl(request)).rejects.toThrow(
          'Download service error',
        );
      });
    });
  });

  describe('Given the controller configuration', () => {
    describe('When checking default expiration time', () => {
      it('Then should have correct default expiration time', () => {
        // Then
        expect(VideoController['DEFAULT_URL_EXPIRATION_SECONDS']).toBe(300);
      });
    });
  });
});
