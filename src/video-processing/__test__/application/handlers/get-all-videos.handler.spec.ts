import { Test, TestingModule } from '@nestjs/testing';
import { GetAllVideosHandler } from '../../../application/handlers/get-all-videos.handler';
import { GetAllVideosQuery } from '../../../application/queries/get-all-videos.query';
import { VIDEO_REPOSITORY } from '../../../domain/repositories/video.repository';
import { Video, VideoStatus } from '../../../domain/entities/video.entity';

describe('GetAllVideosHandler', () => {
  let handler: GetAllVideosHandler;
  let mockVideoRepository: {
    findAll: jest.Mock;
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
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAllVideosHandler,
        {
          provide: VIDEO_REPOSITORY,
          useValue: mockVideoRepository,
        },
      ],
    }).compile();

    handler = module.get<GetAllVideosHandler>(GetAllVideosHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return all videos successfully', async () => {
      const expectedVideos = [mockVideo];
      mockVideoRepository.findAll.mockResolvedValue(expectedVideos);

      const query = new GetAllVideosQuery();
      const result = await handler.execute(query);

      expect(mockVideoRepository.findAll).toHaveBeenCalledTimes(1);
      expect(mockVideoRepository.findAll).toHaveBeenCalledWith();
      expect(result).toEqual(expectedVideos);
    });

    it('should return empty array when no videos exist', async () => {
      const expectedVideos: Video[] = [];
      mockVideoRepository.findAll.mockResolvedValue(expectedVideos);

      const query = new GetAllVideosQuery();
      const result = await handler.execute(query);

      expect(mockVideoRepository.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedVideos);
    });

    it('should return multiple videos', async () => {
      const video1 = { ...mockVideo, id: 'video-1' };
      const video2 = { ...mockVideo, id: 'video-2', userId: 'user-456' };
      const video3 = {
        ...mockVideo,
        id: 'video-3',
        status: VideoStatus.PENDING,
      };
      const expectedVideos = [video1, video2, video3];

      mockVideoRepository.findAll.mockResolvedValue(expectedVideos);

      const query = new GetAllVideosQuery();
      const result = await handler.execute(query);

      expect(result).toHaveLength(3);
      expect(result).toEqual(expectedVideos);
      expect(result[0].id).toBe('video-1');
      expect(result[1].userId).toBe('user-456');
      expect(result[2].status).toBe(VideoStatus.PENDING);
    });

    it('should handle repository errors', async () => {
      const error = new Error('Database connection failed');
      mockVideoRepository.findAll.mockRejectedValue(error);

      const query = new GetAllVideosQuery();

      await expect(handler.execute(query)).rejects.toThrow(
        'Database connection failed',
      );

      expect(mockVideoRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('should handle repository timeout errors', async () => {
      const timeoutError = new Error('Query timeout');
      mockVideoRepository.findAll.mockRejectedValue(timeoutError);

      const query = new GetAllVideosQuery();

      await expect(handler.execute(query)).rejects.toThrow('Query timeout');
    });

    it('should call repository method without parameters', async () => {
      mockVideoRepository.findAll.mockResolvedValue([]);

      const query = new GetAllVideosQuery();
      await handler.execute(query);

      expect(mockVideoRepository.findAll).toHaveBeenCalledWith();
      expect(mockVideoRepository.findAll).toHaveBeenCalledTimes(1);
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

    it('should handle consecutive calls', async () => {
      const videos1 = [mockVideo];
      const videos2 = [{ ...mockVideo, id: 'video-2' }];

      mockVideoRepository.findAll
        .mockResolvedValueOnce(videos1)
        .mockResolvedValueOnce(videos2);

      const query = new GetAllVideosQuery();
      const result1 = await handler.execute(query);
      const result2 = await handler.execute(query);

      expect(result1).toEqual(videos1);
      expect(result2).toEqual(videos2);
      expect(mockVideoRepository.findAll).toHaveBeenCalledTimes(2);
    });
  });

  describe('query handling', () => {
    it('should accept GetAllVideosQuery instance', async () => {
      mockVideoRepository.findAll.mockResolvedValue([]);

      const query = new GetAllVideosQuery();
      await handler.execute(query);

      expect(mockVideoRepository.findAll).toHaveBeenCalled();
    });

    it('should work with different query instances', async () => {
      mockVideoRepository.findAll.mockResolvedValue([mockVideo]);

      const query1 = new GetAllVideosQuery();
      const query2 = new GetAllVideosQuery();

      const result1 = await handler.execute(query1);
      const result2 = await handler.execute(query2);

      expect(result1).toEqual([mockVideo]);
      expect(result2).toEqual([mockVideo]);
      expect(mockVideoRepository.findAll).toHaveBeenCalledTimes(2);
    });
  });
});
