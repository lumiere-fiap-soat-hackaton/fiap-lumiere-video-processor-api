import { Test, TestingModule } from '@nestjs/testing';
import { GetVideosByStatusHandler } from '../../../application/use-cases/get-videos-by-status/get-videos-by-status.handler';
import { GetVideosByStatusQuery } from '../../../application/use-cases/get-videos-by-status/get-videos-by-status.query';
import { VIDEO_REPOSITORY } from '../../../domain/repositories/video.repository';
import { Video, VideoStatus } from '../../../domain/entities/video.entity';

describe('GetVideosByStatusHandler', () => {
  let handler: GetVideosByStatusHandler;
  let mockVideoRepository: {
    findByStatus: jest.Mock;
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
      findByStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetVideosByStatusHandler,
        {
          provide: VIDEO_REPOSITORY,
          useValue: mockVideoRepository,
        },
      ],
    }).compile();

    handler = module.get<GetVideosByStatusHandler>(GetVideosByStatusHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const testStatus = VideoStatus.COMPLETED;

    it('should return videos for specific status successfully', async () => {
      const expectedVideos = [mockVideo];
      mockVideoRepository.findByStatus.mockResolvedValue(expectedVideos);

      const query = new GetVideosByStatusQuery(testStatus);
      const result = await handler.execute(query);

      expect(mockVideoRepository.findByStatus).toHaveBeenCalledTimes(1);
      expect(mockVideoRepository.findByStatus).toHaveBeenCalledWith(testStatus);
      expect(result).toEqual(expectedVideos);
    });

    it('should return empty array when no videos exist with status', async () => {
      const expectedVideos: Video[] = [];
      mockVideoRepository.findByStatus.mockResolvedValue(expectedVideos);

      const query = new GetVideosByStatusQuery(testStatus);
      const result = await handler.execute(query);

      expect(mockVideoRepository.findByStatus).toHaveBeenCalledTimes(1);
      expect(mockVideoRepository.findByStatus).toHaveBeenCalledWith(testStatus);
      expect(result).toEqual(expectedVideos);
    });

    it('should return multiple videos with the same status', async () => {
      const video1 = { ...mockVideo, id: 'video-1' };
      const video2 = {
        ...mockVideo,
        id: 'video-2',
        userId: 'user-456',
      };
      const video3 = {
        ...mockVideo,
        id: 'video-3',
        description: 'Another video',
      };

      const expectedVideos = [video1, video2, video3];

      mockVideoRepository.findByStatus.mockResolvedValue(expectedVideos);

      const query = new GetVideosByStatusQuery(testStatus);
      const result = await handler.execute(query);

      expect(result).toHaveLength(3);
      expect(result).toEqual(expectedVideos);
      expect(result.every((video) => video.status === testStatus)).toBe(true);
    });

    it('should handle different status values', async () => {
      const testCases = [
        VideoStatus.PENDING,
        VideoStatus.PROCESSING,
        VideoStatus.COMPLETED,
        VideoStatus.FAILED,
      ];

      mockVideoRepository.findByStatus.mockResolvedValue([]);

      for (const status of testCases) {
        const query = new GetVideosByStatusQuery(status);
        await handler.execute(query);

        expect(mockVideoRepository.findByStatus).toHaveBeenCalledWith(status);
      }

      expect(mockVideoRepository.findByStatus).toHaveBeenCalledTimes(
        testCases.length,
      );
    });

    it('should handle repository errors', async () => {
      const error = new Error('Database connection failed');
      mockVideoRepository.findByStatus.mockRejectedValue(error);

      const query = new GetVideosByStatusQuery(testStatus);

      await expect(handler.execute(query)).rejects.toThrow(
        'Database connection failed',
      );

      expect(mockVideoRepository.findByStatus).toHaveBeenCalledTimes(1);
      expect(mockVideoRepository.findByStatus).toHaveBeenCalledWith(testStatus);
    });

    it('should handle repository timeout errors', async () => {
      const timeoutError = new Error('Query timeout');
      mockVideoRepository.findByStatus.mockRejectedValue(timeoutError);

      const query = new GetVideosByStatusQuery(testStatus);

      await expect(handler.execute(query)).rejects.toThrow('Query timeout');
    });

    it('should pass status from query to repository', async () => {
      const specificStatus = VideoStatus.PROCESSING;
      mockVideoRepository.findByStatus.mockResolvedValue([]);

      const query = new GetVideosByStatusQuery(specificStatus);
      await handler.execute(query);

      expect(mockVideoRepository.findByStatus).toHaveBeenCalledWith(
        specificStatus,
      );
      expect(mockVideoRepository.findByStatus).toHaveBeenCalledTimes(1);
    });

    it('should handle special characters in status', async () => {
      const specialStatus = 'custom-status-with-special@chars_123';
      mockVideoRepository.findByStatus.mockResolvedValue([]);

      const query = new GetVideosByStatusQuery(specialStatus);
      await handler.execute(query);

      expect(mockVideoRepository.findByStatus).toHaveBeenCalledWith(
        specialStatus,
      );
    });

    it('should handle empty string status', async () => {
      const emptyStatus = '';
      mockVideoRepository.findByStatus.mockResolvedValue([]);

      const query = new GetVideosByStatusQuery(emptyStatus);
      await handler.execute(query);

      expect(mockVideoRepository.findByStatus).toHaveBeenCalledWith(
        emptyStatus,
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

    it('should handle consecutive calls with different statuses', async () => {
      const status1Videos = [{ ...mockVideo, status: VideoStatus.PENDING }];
      const status2Videos = [{ ...mockVideo, status: VideoStatus.COMPLETED }];

      mockVideoRepository.findByStatus
        .mockResolvedValueOnce(status1Videos)
        .mockResolvedValueOnce(status2Videos);

      const query1 = new GetVideosByStatusQuery(VideoStatus.PENDING);
      const query2 = new GetVideosByStatusQuery(VideoStatus.COMPLETED);

      const result1 = await handler.execute(query1);
      const result2 = await handler.execute(query2);

      expect(result1).toEqual(status1Videos);
      expect(result2).toEqual(status2Videos);
      expect(mockVideoRepository.findByStatus).toHaveBeenCalledTimes(2);
      expect(mockVideoRepository.findByStatus).toHaveBeenNthCalledWith(
        1,
        VideoStatus.PENDING,
      );
      expect(mockVideoRepository.findByStatus).toHaveBeenNthCalledWith(
        2,
        VideoStatus.COMPLETED,
      );
    });
  });

  describe('query handling', () => {
    it('should accept GetVideosByStatusQuery instance', async () => {
      mockVideoRepository.findByStatus.mockResolvedValue([]);

      const query = new GetVideosByStatusQuery(VideoStatus.COMPLETED);
      await handler.execute(query);

      expect(mockVideoRepository.findByStatus).toHaveBeenCalledWith(
        VideoStatus.COMPLETED,
      );
    });

    it('should extract status from query correctly', async () => {
      const status = VideoStatus.PROCESSING;
      mockVideoRepository.findByStatus.mockResolvedValue([mockVideo]);

      const query = new GetVideosByStatusQuery(status);
      await handler.execute(query);

      expect(mockVideoRepository.findByStatus).toHaveBeenCalledWith(status);
    });

    it('should work with different query instances for same status', async () => {
      const status = VideoStatus.FAILED;
      mockVideoRepository.findByStatus.mockResolvedValue([mockVideo]);

      const query1 = new GetVideosByStatusQuery(status);
      const query2 = new GetVideosByStatusQuery(status);

      await handler.execute(query1);
      await handler.execute(query2);

      expect(mockVideoRepository.findByStatus).toHaveBeenCalledTimes(2);
      expect(mockVideoRepository.findByStatus).toHaveBeenNthCalledWith(
        1,
        status,
      );
      expect(mockVideoRepository.findByStatus).toHaveBeenNthCalledWith(
        2,
        status,
      );
    });
  });

  describe('edge cases', () => {
    it('should handle very long status string', async () => {
      const longStatus = 'a'.repeat(1000);
      mockVideoRepository.findByStatus.mockResolvedValue([]);

      const query = new GetVideosByStatusQuery(longStatus);
      await handler.execute(query);

      expect(mockVideoRepository.findByStatus).toHaveBeenCalledWith(longStatus);
    });

    it('should handle status with special formats', async () => {
      const specialStatus = 'custom-processing-v2.1';
      mockVideoRepository.findByStatus.mockResolvedValue([mockVideo]);

      const query = new GetVideosByStatusQuery(specialStatus);
      const result = await handler.execute(query);

      expect(mockVideoRepository.findByStatus).toHaveBeenCalledWith(
        specialStatus,
      );
      expect(result).toEqual([mockVideo]);
    });
  });
});
