import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { VideoController } from '@app/video-processing/api/controllers/video.controller';
import { GetAllVideosQuery } from '@app/video-processing/application/use-cases/get-all-videos/get-all-videos.query';
import { GetVideosByUserQuery } from '@app/video-processing/application/use-cases/get-videos-by-user/get-videos-by-user.query';
import { VideoResponseDto } from '@app/video-processing/api/dtos/video-response.dto';
import { GenerateSignedUploadUrlRequest } from '@app/video-processing/api/dtos/generate-signed-upload-url.request';
import { GenerateSignedDownloadUrlRequest } from '@app/video-processing/api/dtos/generate-signed-download-url.request';
import { GenerateSignedUploadUrlOutput } from '@app/video-processing/application/use-cases/generate-signed-upload-url/generate-signed-upload-url.output';
import { GenerateSignedDownloadUrlOutput } from '@app/video-processing/application/use-cases/generate-signed-download-url/generate-signed-download-url.output';
import { mock, MockProxy } from 'jest-mock-extended';

describe('VideoController - BDD Tests', () => {
  let controller: VideoController;
  let commandBus: MockProxy<CommandBus>;
  let queryBus: MockProxy<QueryBus>;

  beforeEach(async () => {
    commandBus = mock<CommandBus>();
    queryBus = mock<QueryBus>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VideoController],
      providers: [
        {
          provide: CommandBus,
          useValue: commandBus,
        },
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
          resultFileKey: 'video.mp4',
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
          resultFileKey: 'video.mp4',
          signedUrl: 'https://s3.amazonaws.com/bucket/video.mp4?signature',
        });
        expect(commandBus.execute).toHaveBeenCalledTimes(1);
      });
    });

    describe('When the command bus throws an error', () => {
      it('Then should propagate the error', async () => {
        // Given
        const request: GenerateSignedDownloadUrlRequest = {
          resultFileKey: 'nonexistent.mp4',
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

  // Video Listing Tests
  describe('Given a user wants to retrieve video information', () => {
    const mockVideoResponse: VideoResponseDto = {
      id: 'test-video-123',
      userId: 'user-123',
      filename: 'test-video.mp4',
      status: 'completed',
      createdAt: new Date('2023-01-01T00:00:00.000Z'),
      updatedAt: new Date('2023-01-02T00:00:00.000Z'),
    };

    describe('When requesting all videos in the system', () => {
      it('Then should return all videos successfully', async () => {
        // Given
        const expectedVideos = [mockVideoResponse];
        queryBus.execute.mockResolvedValue(expectedVideos);

        // When
        const result = await controller.getAllVideos();

        // Then
        expect(queryBus.execute).toHaveBeenCalledTimes(1);
        expect(queryBus.execute).toHaveBeenCalledWith(
          expect.any(GetAllVideosQuery),
        );
        expect(result).toEqual(expectedVideos);
      });

      it('Then should return empty array when no videos exist', async () => {
        // Given
        const expectedVideos: VideoResponseDto[] = [];
        queryBus.execute.mockResolvedValue(expectedVideos);

        // When
        const result = await controller.getAllVideos();

        // Then
        expect(queryBus.execute).toHaveBeenCalledTimes(1);
        expect(queryBus.execute).toHaveBeenCalledWith(
          expect.any(GetAllVideosQuery),
        );
        expect(result).toEqual(expectedVideos);
      });

      it('Then should handle query bus errors gracefully', async () => {
        // Given
        const error = new Error('Query execution failed');
        queryBus.execute.mockRejectedValue(error);

        // When & Then
        await expect(controller.getAllVideos()).rejects.toThrow(
          'Query execution failed',
        );

        expect(queryBus.execute).toHaveBeenCalledTimes(1);
        expect(queryBus.execute).toHaveBeenCalledWith(
          expect.any(GetAllVideosQuery),
        );
      });
    });

    describe('When requesting videos for a specific user', () => {
      const testUserId = 'user-123';

      it('Then should return videos for the user successfully', async () => {
        // Given
        const expectedVideos = [mockVideoResponse];
        queryBus.execute.mockResolvedValue(expectedVideos);

        // When
        const result = await controller.getVideosByUser(testUserId);

        // Then
        expect(queryBus.execute).toHaveBeenCalledTimes(1);
        expect(queryBus.execute).toHaveBeenCalledWith(
          expect.any(GetVideosByUserQuery),
        );
        expect(result).toEqual(expectedVideos);
      });

      it('Then should return empty array when user has no videos', async () => {
        // Given
        const expectedVideos: VideoResponseDto[] = [];
        queryBus.execute.mockResolvedValue(expectedVideos);

        // When
        const result = await controller.getVideosByUser(testUserId);

        // Then
        expect(queryBus.execute).toHaveBeenCalledTimes(1);
        expect(result).toEqual(expectedVideos);
      });

      it('Then should handle query bus errors for user videos', async () => {
        // Given
        const error = new Error('User not found');
        queryBus.execute.mockRejectedValue(error);

        // When & Then
        await expect(controller.getVideosByUser(testUserId)).rejects.toThrow(
          'User not found',
        );

        expect(queryBus.execute).toHaveBeenCalledTimes(1);
      });

      it('Then should pass correct userId to GetVideosByUserQuery', async () => {
        // Given
        queryBus.execute.mockResolvedValue([]);

        // When
        await controller.getVideosByUser(testUserId);

        // Then
        expect(queryBus.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: testUserId,
          }),
        );
      });

      it('Then should handle different user IDs correctly', async () => {
        // Given
        const differentUserId = 'different-user-456';
        const userVideos = [
          {
            ...mockVideoResponse,
            id: 'video-456',
            userId: differentUserId,
          },
        ];
        queryBus.execute.mockResolvedValue(userVideos);

        // When
        const result = await controller.getVideosByUser(differentUserId);

        // Then
        expect(result).toEqual(userVideos);
        expect(result[0].userId).toBe(differentUserId);

        expect(queryBus.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: differentUserId,
          }),
        );
      });

      it('Then should handle special characters in userId', async () => {
        // Given
        const specialUserId = 'user-with-special@chars_123';
        queryBus.execute.mockResolvedValue([]);

        // When
        await controller.getVideosByUser(specialUserId);

        // Then
        expect(queryBus.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: specialUserId,
          }),
        );
      });

      it('Then should handle empty string userId', async () => {
        // Given
        queryBus.execute.mockResolvedValue([]);

        // When
        await controller.getVideosByUser('');

        // Then
        expect(queryBus.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: '',
          }),
        );
      });
    });

    describe('When making multiple consecutive video requests', () => {
      it('Then should handle multiple calls correctly', async () => {
        // Given
        const videos1 = [mockVideoResponse];
        const videos2 = [{ ...mockVideoResponse, id: 'video-2' }];

        queryBus.execute
          .mockResolvedValueOnce(videos1)
          .mockResolvedValueOnce(videos2);

        // When
        const result1 = await controller.getAllVideos();
        const result2 = await controller.getVideosByUser('user-123');

        // Then
        expect(result1).toEqual(videos1);
        expect(result2).toEqual(videos2);
        expect(queryBus.execute).toHaveBeenCalledTimes(2);
      });
    });
  });
});
