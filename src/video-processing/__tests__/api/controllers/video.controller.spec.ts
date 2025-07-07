import { Test, TestingModule } from '@nestjs/testing';
import { QueryBus } from '@nestjs/cqrs';
import { VideoController } from '@app/video-processing/api/controllers/video.controller';
import { GetSignedUploadUrlRequest } from '@app/video-processing/api/dtos/get-signed-upload-url.request';
import { GetSignedDownloadUrlRequest } from '@app/video-processing/api/dtos/get-signed-download-url.request';
import { GetSignedUploadUrlOutput } from '@app/video-processing/application/use-cases/get-signed-upload-url/get-signed-upload-url.output';
import { GetSignedDownloadUrlOutput } from '@app/video-processing/application/use-cases/get-signed-download-url/get-signed-download-url.output';
import { mock, MockProxy } from 'jest-mock-extended';

describe('VideoController', () => {
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

  describe('generateSignedUploadUrl', () => {
    it('should generate signed upload URLs for single file successfully', async () => {
      // Arrange
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

      // Act
      const result = await controller.generateSignedUploadUrl(requestFiles);

      // Assert
      expect(result).toEqual(expectedOutput.signedUrls);
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          files: requestFiles,
          expiresIn: 300, // DEFAULT_URL_EXPIRATION_SECONDS
        }),
      );
      expect(queryBus.execute).toHaveBeenCalledTimes(1);
    });

    it('should generate signed upload URLs for multiple files successfully', async () => {
      // Arrange
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

      // Act
      const result = await controller.generateSignedUploadUrl(requestFiles);

      // Assert
      expect(result).toEqual(expectedOutput.signedUrls);
      expect(result).toHaveLength(3);
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          files: requestFiles,
          expiresIn: 300,
        }),
      );
    });

    it('should handle empty files array', async () => {
      // Arrange
      const requestFiles: GetSignedUploadUrlRequest[] = [];
      const expectedOutput = new GetSignedUploadUrlOutput([]);

      queryBus.execute.mockResolvedValue(expectedOutput);

      // Act
      const result = await controller.generateSignedUploadUrl(requestFiles);

      // Assert
      expect(result).toEqual([]);
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          files: [],
          expiresIn: 300,
        }),
      );
    });

    it('should handle query bus errors', async () => {
      // Arrange
      const requestFiles: GetSignedUploadUrlRequest[] = [
        {
          fileName: 'test-video.mp4',
          contentType: 'video/mp4',
        },
      ];

      const error = new Error('Query bus execution failed');
      queryBus.execute.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.generateSignedUploadUrl(requestFiles),
      ).rejects.toThrow('Query bus execution failed');
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          files: requestFiles,
          expiresIn: 300,
        }),
      );
    });

    it('should use default expiration time', async () => {
      // Arrange
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

      // Act
      await controller.generateSignedUploadUrl(requestFiles);

      // Assert
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          expiresIn: 300, // DEFAULT_URL_EXPIRATION_SECONDS
        }),
      );
    });
  });

  describe('getDownloadUrl', () => {
    it('should generate signed download URL successfully', async () => {
      // Arrange
      const request: GetSignedDownloadUrlRequest = {
        fileName: 'test-video.mp4',
      };

      const expectedOutput = new GetSignedDownloadUrlOutput(
        'https://s3.amazonaws.com/bucket/test-video.mp4?signature=download-test',
      );

      queryBus.execute.mockResolvedValue(expectedOutput);

      // Act
      const result = await controller.getDownloadUrl(request);

      // Assert
      expect(result).toBe(expectedOutput.signedUrl);
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: 'test-video.mp4',
          expiresIn: 300,
        }),
      );
      expect(queryBus.execute).toHaveBeenCalledTimes(1);
    });

    it('should handle query bus errors for download URL', async () => {
      // Arrange
      const request: GetSignedDownloadUrlRequest = {
        fileName: 'test-video.mp4',
      };

      const error = new Error('Download URL generation failed');
      queryBus.execute.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getDownloadUrl(request)).rejects.toThrow(
        'Download URL generation failed',
      );
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: 'test-video.mp4',
          expiresIn: 300,
        }),
      );
    });

    it('should use default expiration time for download URL', async () => {
      // Arrange
      const request: GetSignedDownloadUrlRequest = {
        fileName: 'long-video.mov',
      };

      const expectedOutput = new GetSignedDownloadUrlOutput(
        'https://s3.amazonaws.com/bucket/long-video.mov?signature=download-test',
      );

      queryBus.execute.mockResolvedValue(expectedOutput);

      // Act
      await controller.getDownloadUrl(request);

      // Assert
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: 'long-video.mov',
          expiresIn: 300, // DEFAULT_URL_EXPIRATION_SECONDS
        }),
      );
    });

    it('should handle different file types for download URL', async () => {
      // Arrange
      const request: GetSignedDownloadUrlRequest = {
        fileName: 'presentation.avi',
      };

      const expectedOutput = new GetSignedDownloadUrlOutput(
        'https://s3.amazonaws.com/bucket/presentation.avi?signature=download-test',
      );

      queryBus.execute.mockResolvedValue(expectedOutput);

      // Act
      const result = await controller.getDownloadUrl(request);

      // Assert
      expect(result).toBe(expectedOutput.signedUrl);
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: 'presentation.avi',
          expiresIn: 300,
        }),
      );
    });
  });

  describe('controller configuration', () => {
    it('should have correct default expiration time', () => {
      // Assert
      expect(VideoController['DEFAULT_URL_EXPIRATION_SECONDS']).toBe(300);
    });
  });
});
