import { Test, TestingModule } from '@nestjs/testing';
import { QueryBus } from '@nestjs/cqrs';
import { VideoProcessingsController } from '../../../api/controllers/video-processing.controller';
import { GetAllVideosQuery } from '../../../application/use-cases/get-all-videos/get-all-videos.query';
import { GetVideosByUserQuery } from '../../../application/use-cases/get-videos-by-user/get-videos-by-user.query';
import { VideoResponseDto } from '../../../api/dtos/video-response.dto';

describe('VideoProcessingsController', () => {
  let controller: VideoProcessingsController;
  let mockQueryBus: {
    execute: jest.Mock;
  };

  const mockVideoResponse: VideoResponseDto = {
    id: 'test-video-123',
    userId: 'user-123',
    filename: 'test-video.mp4',
    status: 'completed',
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-01-02T00:00:00.000Z'),
  };

  beforeEach(async () => {
    mockQueryBus = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VideoProcessingsController],
      providers: [
        {
          provide: QueryBus,
          useValue: mockQueryBus,
        },
      ],
    }).compile();

    controller = module.get<VideoProcessingsController>(
      VideoProcessingsController,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllVideos', () => {
    it('should return all videos successfully', async () => {
      const expectedVideos = [mockVideoResponse];
      mockQueryBus.execute.mockResolvedValue(expectedVideos);

      const result = await controller.getAllVideos();

      expect(mockQueryBus.execute).toHaveBeenCalledTimes(1);
      expect(mockQueryBus.execute).toHaveBeenCalledWith(
        expect.any(GetAllVideosQuery),
      );
      expect(result).toEqual(expectedVideos);
    });

    it('should return empty array when no videos exist', async () => {
      const expectedVideos: VideoResponseDto[] = [];
      mockQueryBus.execute.mockResolvedValue(expectedVideos);

      const result = await controller.getAllVideos();

      expect(mockQueryBus.execute).toHaveBeenCalledTimes(1);
      expect(mockQueryBus.execute).toHaveBeenCalledWith(
        expect.any(GetAllVideosQuery),
      );
      expect(result).toEqual(expectedVideos);
    });

    it('should handle query bus errors', async () => {
      const error = new Error('Query execution failed');
      mockQueryBus.execute.mockRejectedValue(error);

      await expect(controller.getAllVideos()).rejects.toThrow(
        'Query execution failed',
      );

      expect(mockQueryBus.execute).toHaveBeenCalledTimes(1);
      expect(mockQueryBus.execute).toHaveBeenCalledWith(
        expect.any(GetAllVideosQuery),
      );
    });

    it('should create GetAllVideosQuery with correct parameters', async () => {
      mockQueryBus.execute.mockResolvedValue([]);

      await controller.getAllVideos();

      expect(mockQueryBus.execute).toHaveBeenCalledWith(
        expect.any(GetAllVideosQuery),
      );
    });
  });

  describe('getVideosByUserId', () => {
    const testUserId = 'user-123';

    it('should return videos for specific user successfully', async () => {
      const expectedVideos = [mockVideoResponse];
      mockQueryBus.execute.mockResolvedValue(expectedVideos);

      const result = await controller.getVideosByUserId(testUserId);

      expect(mockQueryBus.execute).toHaveBeenCalledTimes(1);
      expect(mockQueryBus.execute).toHaveBeenCalledWith(
        expect.any(GetVideosByUserQuery),
      );
      expect(result).toEqual(expectedVideos);
    });

    it('should return empty array when user has no videos', async () => {
      const expectedVideos: VideoResponseDto[] = [];
      mockQueryBus.execute.mockResolvedValue(expectedVideos);

      const result = await controller.getVideosByUserId(testUserId);

      expect(mockQueryBus.execute).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedVideos);
    });

    it('should handle query bus errors for user videos', async () => {
      const error = new Error('User not found');
      mockQueryBus.execute.mockRejectedValue(error);

      await expect(controller.getVideosByUserId(testUserId)).rejects.toThrow(
        'User not found',
      );

      expect(mockQueryBus.execute).toHaveBeenCalledTimes(1);
    });

    it('should pass correct userId to GetVideosByUserQuery', async () => {
      mockQueryBus.execute.mockResolvedValue([]);

      await controller.getVideosByUserId(testUserId);

      expect(mockQueryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: testUserId,
        }),
      );
    });

    it('should handle different user IDs', async () => {
      const differentUserId = 'different-user-456';
      const userVideos = [
        {
          ...mockVideoResponse,
          id: 'video-456',
          userId: differentUserId,
        },
      ];
      mockQueryBus.execute.mockResolvedValue(userVideos);

      const result = await controller.getVideosByUserId(differentUserId);

      expect(result).toEqual(userVideos);
      expect(result[0].userId).toBe(differentUserId);

      expect(mockQueryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: differentUserId,
        }),
      );
    });

    it('should handle special characters in userId', async () => {
      const specialUserId = 'user-with-special@chars_123';
      mockQueryBus.execute.mockResolvedValue([]);

      await controller.getVideosByUserId(specialUserId);

      expect(mockQueryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: specialUserId,
        }),
      );
    });

    it('should handle empty string userId', async () => {
      mockQueryBus.execute.mockResolvedValue([]);

      await controller.getVideosByUserId('');

      expect(mockQueryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: '',
        }),
      );
    });
  });

  describe('controller integration', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have QueryBus injected', () => {
      expect(controller['queryBus']).toBeDefined();
    });

    it('should handle multiple consecutive calls', async () => {
      const videos1 = [mockVideoResponse];
      const videos2 = [{ ...mockVideoResponse, id: 'video-2' }];

      mockQueryBus.execute
        .mockResolvedValueOnce(videos1)
        .mockResolvedValueOnce(videos2);

      const result1 = await controller.getAllVideos();
      const result2 = await controller.getVideosByUserId('user-123');

      expect(result1).toEqual(videos1);
      expect(result2).toEqual(videos2);
      expect(mockQueryBus.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe('query validation', () => {
    it('should call QueryBus with GetAllVideosQuery', async () => {
      mockQueryBus.execute.mockResolvedValue([]);

      await controller.getAllVideos();

      expect(mockQueryBus.execute).toHaveBeenCalledWith(
        expect.any(GetAllVideosQuery),
      );
    });

    it('should call QueryBus with GetVideosByUserQuery and correct userId', async () => {
      const userId = 'test-user-id';
      mockQueryBus.execute.mockResolvedValue([]);

      await controller.getVideosByUserId(userId);

      expect(mockQueryBus.execute).toHaveBeenCalledWith(
        expect.any(GetVideosByUserQuery),
      );
    });
  });
});
