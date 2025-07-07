import { Test, TestingModule } from '@nestjs/testing';
import { GetVideosByUserHandler } from '../../../application/use-cases/get-videos-by-user/get-videos-by-user.handler';
import { GetVideosByUserQuery } from '../../../application/use-cases/get-videos-by-user/get-videos-by-user.query';
import { VIDEO_REPOSITORY } from '../../../domain/repositories/video.repository';
import { Video, VideoStatus } from '../../../domain/entities/video.entity';

describe('GetVideosByUserHandler', () => {
  let handler: GetVideosByUserHandler;
  let mockVideoRepository: {
    findByUserId: jest.Mock;
  };

  const mockVideo: Video = {
    id: 'test-video-123',
    sourceFileKey: 'uploads/test-video.mp4',
    sourceFileName: 'test-video.mp4',
    description: 'Test video description',
    status: VideoStatus.COMPLETED,
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-01-02T00:00:00.000Z'),
    userId: 'user-123',
  };

  beforeEach(async () => {
    mockVideoRepository = {
      findByUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetVideosByUserHandler,
        {
          provide: VIDEO_REPOSITORY,
          useValue: mockVideoRepository,
        },
      ],
    }).compile();

    handler = module.get<GetVideosByUserHandler>(GetVideosByUserHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const testUserId = 'user-123';

    it('should return videos for specific user successfully', async () => {
      const expectedVideos = [mockVideo];
      mockVideoRepository.findByUserId.mockResolvedValue(expectedVideos);

      const query = new GetVideosByUserQuery(testUserId);
      const result = await handler.execute(query);

      expect(mockVideoRepository.findByUserId).toHaveBeenCalledTimes(1);
      expect(mockVideoRepository.findByUserId).toHaveBeenCalledWith(testUserId);
      expect(result).toEqual(expectedVideos);
    });

    it('should return empty array when user has no videos', async () => {
      const expectedVideos: Video[] = [];
      mockVideoRepository.findByUserId.mockResolvedValue(expectedVideos);

      const query = new GetVideosByUserQuery(testUserId);
      const result = await handler.execute(query);

      expect(mockVideoRepository.findByUserId).toHaveBeenCalledTimes(1);
      expect(mockVideoRepository.findByUserId).toHaveBeenCalledWith(testUserId);
      expect(result).toEqual(expectedVideos);
    });

    it('should return multiple videos for the same user', async () => {
      const video1 = { ...mockVideo, id: 'video-1' };
      const video2 = {
        ...mockVideo,
        id: 'video-2',
        status: VideoStatus.PENDING,
      };
      const video3 = {
        ...mockVideo,
        id: 'video-3',
        description: 'Another video',
      };
      const expectedVideos = [video1, video2, video3];

      mockVideoRepository.findByUserId.mockResolvedValue(expectedVideos);

      const query = new GetVideosByUserQuery(testUserId);
      const result = await handler.execute(query);

      expect(result).toHaveLength(3);
      expect(result).toEqual(expectedVideos);
      expect(result.every((video) => video.userId === testUserId)).toBe(true);
    });

    it('should handle different user IDs', async () => {
      const differentUserId = 'user-456';
      const userVideo = {
        ...mockVideo,
        id: 'video-456',
        userId: differentUserId,
      };
      mockVideoRepository.findByUserId.mockResolvedValue([userVideo]);

      const query = new GetVideosByUserQuery(differentUserId);
      const result = await handler.execute(query);

      expect(mockVideoRepository.findByUserId).toHaveBeenCalledWith(
        differentUserId,
      );
      expect(result[0].userId).toBe(differentUserId);
    });

    it('should handle repository errors', async () => {
      const error = new Error('Database connection failed');
      mockVideoRepository.findByUserId.mockRejectedValue(error);

      const query = new GetVideosByUserQuery(testUserId);

      await expect(handler.execute(query)).rejects.toThrow(
        'Database connection failed',
      );

      expect(mockVideoRepository.findByUserId).toHaveBeenCalledTimes(1);
      expect(mockVideoRepository.findByUserId).toHaveBeenCalledWith(testUserId);
    });

    it('should handle repository timeout errors', async () => {
      const timeoutError = new Error('Query timeout');
      mockVideoRepository.findByUserId.mockRejectedValue(timeoutError);

      const query = new GetVideosByUserQuery(testUserId);

      await expect(handler.execute(query)).rejects.toThrow('Query timeout');
    });

    it('should pass userId from query to repository', async () => {
      const specificUserId = 'specific-user-789';
      mockVideoRepository.findByUserId.mockResolvedValue([]);

      const query = new GetVideosByUserQuery(specificUserId);
      await handler.execute(query);

      expect(mockVideoRepository.findByUserId).toHaveBeenCalledWith(
        specificUserId,
      );
      expect(mockVideoRepository.findByUserId).toHaveBeenCalledTimes(1);
    });

    it('should handle special characters in userId', async () => {
      const specialUserId = 'user-with-special@chars_123';
      mockVideoRepository.findByUserId.mockResolvedValue([]);

      const query = new GetVideosByUserQuery(specialUserId);
      await handler.execute(query);

      expect(mockVideoRepository.findByUserId).toHaveBeenCalledWith(
        specialUserId,
      );
    });

    it('should handle empty string userId', async () => {
      const emptyUserId = '';
      mockVideoRepository.findByUserId.mockResolvedValue([]);

      const query = new GetVideosByUserQuery(emptyUserId);
      await handler.execute(query);

      expect(mockVideoRepository.findByUserId).toHaveBeenCalledWith(
        emptyUserId,
      );
    });
  });

  describe('handler integration', () => {
    it('should be defined', () => {
      expect(handler).toBeDefined();
    });

    it('should have video repository injected', () => {
      expect(handler['videoRepository']).toBeDefined();
    });

    it('should implement IQueryHandler interface', () => {
      expect(typeof handler.execute).toBe('function');
    });

    it('should handle consecutive calls with different users', async () => {
      const user1Videos = [{ ...mockVideo, userId: 'user-1' }];
      const user2Videos = [{ ...mockVideo, userId: 'user-2' }];

      mockVideoRepository.findByUserId
        .mockResolvedValueOnce(user1Videos)
        .mockResolvedValueOnce(user2Videos);

      const query1 = new GetVideosByUserQuery('user-1');
      const query2 = new GetVideosByUserQuery('user-2');

      const result1 = await handler.execute(query1);
      const result2 = await handler.execute(query2);

      expect(result1).toEqual(user1Videos);
      expect(result2).toEqual(user2Videos);
      expect(mockVideoRepository.findByUserId).toHaveBeenCalledTimes(2);
      expect(mockVideoRepository.findByUserId).toHaveBeenNthCalledWith(
        1,
        'user-1',
      );
      expect(mockVideoRepository.findByUserId).toHaveBeenNthCalledWith(
        2,
        'user-2',
      );
    });
  });

  describe('query handling', () => {
    it('should accept GetVideosByUserQuery instance', async () => {
      mockVideoRepository.findByUserId.mockResolvedValue([]);

      const query = new GetVideosByUserQuery('test-user');
      await handler.execute(query);

      expect(mockVideoRepository.findByUserId).toHaveBeenCalledWith(
        'test-user',
      );
    });

    it('should extract userId from query correctly', async () => {
      const userId = 'extracted-user-id';
      mockVideoRepository.findByUserId.mockResolvedValue([mockVideo]);

      const query = new GetVideosByUserQuery(userId);
      await handler.execute(query);

      expect(mockVideoRepository.findByUserId).toHaveBeenCalledWith(userId);
    });

    it('should work with different query instances for same user', async () => {
      const userId = 'same-user';
      mockVideoRepository.findByUserId.mockResolvedValue([mockVideo]);

      const query1 = new GetVideosByUserQuery(userId);
      const query2 = new GetVideosByUserQuery(userId);

      await handler.execute(query1);
      await handler.execute(query2);

      expect(mockVideoRepository.findByUserId).toHaveBeenCalledTimes(2);
      expect(mockVideoRepository.findByUserId).toHaveBeenNthCalledWith(
        1,
        userId,
      );
      expect(mockVideoRepository.findByUserId).toHaveBeenNthCalledWith(
        2,
        userId,
      );
    });
  });

  describe('edge cases', () => {
    it('should handle very long userId', async () => {
      const longUserId = 'a'.repeat(1000);
      mockVideoRepository.findByUserId.mockResolvedValue([]);

      const query = new GetVideosByUserQuery(longUserId);
      await handler.execute(query);

      expect(mockVideoRepository.findByUserId).toHaveBeenCalledWith(longUserId);
    });

    it('should handle userId with special formats', async () => {
      const uuidUserId = '123e4567-e89b-12d3-a456-426614174000';
      mockVideoRepository.findByUserId.mockResolvedValue([mockVideo]);

      const query = new GetVideosByUserQuery(uuidUserId);
      const result = await handler.execute(query);

      expect(mockVideoRepository.findByUserId).toHaveBeenCalledWith(uuidUserId);
      expect(result).toEqual([mockVideo]);
    });
  });
});
