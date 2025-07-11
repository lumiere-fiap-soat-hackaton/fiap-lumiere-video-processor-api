import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DynamoDbVideoRepository } from '../../../infrastructure/repositories/dynamodb-video.repository';
import { DYNAMODB_DOCUMENT_CLIENT } from '../../../infrastructure/database/dynamodb/dynamodb.module';
import { Video, VideoStatus } from '../../../domain/entities/video.entity';

describe('DynamoDbVideoRepository', () => {
  let repository: DynamoDbVideoRepository;
  let mockDynamoClient: any;
  let mockConfigService: {
    get: jest.Mock;
  };

  const mockVideo: Video = {
    id: 'test-id-123',
    sourceFileKey: 'uploads/test-video.mp4',
    sourceFileName: 'test-video.mp4',
    description: 'Test video description',
    status: VideoStatus.PENDING,
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-01-01T00:00:00.000Z'),
    userId: 'user-123',
  };

  beforeEach(async () => {
    mockDynamoClient = {
      send: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn(),
    };

    // Mock do nome da tabela
    mockConfigService.get.mockReturnValue('videos');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DynamoDbVideoRepository,
        {
          provide: DYNAMODB_DOCUMENT_CLIENT,
          useValue: mockDynamoClient,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    repository = module.get<DynamoDbVideoRepository>(DynamoDbVideoRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new video successfully', async () => {
      const videoData = {
        sourceFileKey: 'uploads/test-video.mp4',
        sourceFileName: 'test-video.mp4',
        description: 'Test video description',
        userId: 'user-123',
      };

      mockDynamoClient.send.mockResolvedValue({});

      const result = await repository.create(videoData);

      expect(result).toMatchObject({
        ...videoData,
        status: VideoStatus.PENDING,
      });
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(1);
    });

    it('should throw error when DynamoDB fails', async () => {
      const videoData = {
        sourceFileKey: 'uploads/test-video.mp4',
        sourceFileName: 'test-video.mp4',
        description: 'Test video description',
        userId: 'user-123',
      };

      mockDynamoClient.send.mockRejectedValue(new Error('DynamoDB error'));

      await expect(repository.create(videoData)).rejects.toThrow(
        'DynamoDB error',
      );
    });
  });

  describe('findById', () => {
    it('should return video when found', async () => {
      const dynamoItem = {
        id: mockVideo.id,
        sourceFileKey: mockVideo.sourceFileKey,
        sourceFileName: mockVideo.sourceFileName,
        description: mockVideo.description,
        status: mockVideo.status,
        createdAt: mockVideo.createdAt.toISOString(),
        updatedAt: mockVideo.updatedAt.toISOString(),
        userId: mockVideo.userId,
      };

      mockDynamoClient.send.mockResolvedValue({
        Item: dynamoItem,
      });

      const result = await repository.findById('test-id-123');

      expect(result).toEqual(mockVideo);
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(1);
    });

    it('should return null when video not found', async () => {
      mockDynamoClient.send.mockResolvedValue({});

      const result = await repository.findById('non-existent-id');

      expect(result).toBeNull();
    });

    it('should handle DynamoDB errors', async () => {
      mockDynamoClient.send.mockRejectedValue(new Error('Database error'));

      await expect(repository.findById('test-id-123')).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('findByUserId', () => {
    it('should return videos for user', async () => {
      const dynamoItems = [
        {
          id: mockVideo.id,
          sourceFileKey: mockVideo.sourceFileKey,
          sourceFileName: mockVideo.sourceFileName,
          description: mockVideo.description,
          status: mockVideo.status,
          createdAt: mockVideo.createdAt.toISOString(),
          updatedAt: mockVideo.updatedAt.toISOString(),
          userId: mockVideo.userId,
        },
      ];

      mockDynamoClient.send.mockResolvedValue({
        Items: dynamoItems,
      });

      const result = await repository.findByUserId('user-123');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockVideo);
      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            FilterExpression: '#userId = :userId',
            ExpressionAttributeNames: { '#userId': 'userId' },
            ExpressionAttributeValues: { ':userId': 'user-123' },
          }),
        }),
      );
    });

    it('should return empty array when no videos found', async () => {
      mockDynamoClient.send.mockResolvedValue({
        Items: [],
      });

      const result = await repository.findByUserId('user-123');

      expect(result).toEqual([]);
    });

    it('should handle undefined Items in response', async () => {
      mockDynamoClient.send.mockResolvedValue({});

      const result = await repository.findByUserId('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('findByStatus', () => {
    it('should return videos for specific status', async () => {
      const dynamoItems = [
        {
          id: mockVideo.id,
          sourceFileKey: mockVideo.sourceFileKey,
          sourceFileName: mockVideo.sourceFileName,
          description: mockVideo.description,
          status: mockVideo.status,
          createdAt: mockVideo.createdAt.toISOString(),
          updatedAt: mockVideo.updatedAt.toISOString(),
          userId: mockVideo.userId,
        },
      ];

      mockDynamoClient.send.mockResolvedValue({
        Items: dynamoItems,
      });

      const result = await repository.findByStatus(VideoStatus.COMPLETED);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockVideo);
      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            FilterExpression: '#status = :status',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: { ':status': VideoStatus.COMPLETED },
          }),
        }),
      );
    });

    it('should return empty array when no videos found with status', async () => {
      mockDynamoClient.send.mockResolvedValue({
        Items: [],
      });

      const result = await repository.findByStatus(VideoStatus.PENDING);

      expect(result).toEqual([]);
    });

    it('should handle undefined Items in response', async () => {
      mockDynamoClient.send.mockResolvedValue({});

      const result = await repository.findByStatus(VideoStatus.FAILED);

      expect(result).toEqual([]);
    });

    it('should return multiple videos with same status', async () => {
      const video1 = {
        ...mockVideo,
        id: 'video-1',
        status: VideoStatus.COMPLETED,
      };
      const video2 = {
        ...mockVideo,
        id: 'video-2',
        userId: 'user-456',
        status: VideoStatus.COMPLETED,
      };
      const video3 = {
        ...mockVideo,
        id: 'video-3',
        description: 'Another video',
        status: VideoStatus.COMPLETED,
      };

      const dynamoItems = [
        {
          id: video1.id,
          sourceFileKey: video1.sourceFileKey,
          sourceFileName: video1.sourceFileName,
          description: video1.description,
          status: video1.status,
          createdAt: video1.createdAt.toISOString(),
          updatedAt: video1.updatedAt.toISOString(),
          userId: video1.userId,
        },
        {
          id: video2.id,
          sourceFileKey: video2.sourceFileKey,
          sourceFileName: video2.sourceFileName,
          description: video2.description,
          status: video2.status,
          createdAt: video2.createdAt.toISOString(),
          updatedAt: video2.updatedAt.toISOString(),
          userId: video2.userId,
        },
        {
          id: video3.id,
          sourceFileKey: video3.sourceFileKey,
          sourceFileName: video3.sourceFileName,
          description: video3.description,
          status: video3.status,
          createdAt: video3.createdAt.toISOString(),
          updatedAt: video3.updatedAt.toISOString(),
          userId: video3.userId,
        },
      ];

      mockDynamoClient.send.mockResolvedValue({
        Items: dynamoItems,
      });

      const result = await repository.findByStatus(VideoStatus.COMPLETED);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(video1);
      expect(result[1]).toEqual(video2);
      expect(result[2]).toEqual(video3);
      expect(
        result.every((video) => video.status === VideoStatus.COMPLETED),
      ).toBe(true);
    });

    it('should handle different video status values', async () => {
      const testCases = [
        VideoStatus.PENDING,
        VideoStatus.PROCESSING,
        VideoStatus.COMPLETED,
        VideoStatus.FAILED,
      ];

      mockDynamoClient.send.mockResolvedValue({
        Items: [],
      });

      for (const status of testCases) {
        await repository.findByStatus(status);

        expect(mockDynamoClient.send).toHaveBeenCalledWith(
          expect.objectContaining({
            input: expect.objectContaining({
              FilterExpression: '#status = :status',
              ExpressionAttributeNames: { '#status': 'status' },
              ExpressionAttributeValues: { ':status': status },
            }),
          }),
        );
      }

      expect(mockDynamoClient.send).toHaveBeenCalledTimes(testCases.length);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      mockDynamoClient.send.mockRejectedValue(error);

      await expect(
        repository.findByStatus(VideoStatus.COMPLETED),
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('findAll', () => {
    it('should return all videos', async () => {
      const dynamoItems = [
        {
          id: mockVideo.id,
          sourceFileKey: mockVideo.sourceFileKey,
          sourceFileName: mockVideo.sourceFileName,
          description: mockVideo.description,
          status: mockVideo.status,
          createdAt: mockVideo.createdAt.toISOString(),
          updatedAt: mockVideo.updatedAt.toISOString(),
          userId: mockVideo.userId,
        },
      ];

      mockDynamoClient.send.mockResolvedValue({
        Items: dynamoItems,
      });

      const result = await repository.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockVideo);
    });

    it('should return empty array when no videos exist', async () => {
      mockDynamoClient.send.mockResolvedValue({
        Items: [],
      });

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update video successfully', async () => {
      const updateData = {
        description: 'Updated description',
        status: VideoStatus.COMPLETED,
      };

      const updatedAttributes = {
        id: mockVideo.id,
        sourceFileKey: mockVideo.sourceFileKey,
        sourceFileName: mockVideo.sourceFileName,
        description: updateData.description,
        status: updateData.status,
        createdAt: mockVideo.createdAt.toISOString(),
        updatedAt: new Date('2023-01-02T00:00:00.000Z').toISOString(),
        userId: mockVideo.userId,
      };

      mockDynamoClient.send.mockResolvedValue({
        Attributes: updatedAttributes,
      });

      const result = await repository.update('test-id-123', updateData);

      expect(result.description).toBe(updateData.description);
      expect(result.status).toBe(updateData.status);
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(1);
    });

    it('should throw error when video not found', async () => {
      const updateData = { description: 'Updated description' };
      const error = new Error('ConditionalCheckFailedException');
      error.name = 'ConditionalCheckFailedException';

      mockDynamoClient.send.mockRejectedValue(error);

      // Ajustar para a mensagem que realmente é lançada
      await expect(
        repository.update('non-existent-id', updateData),
      ).rejects.toThrow(
        'DynamoDB operation failed: ConditionalCheckFailedException',
      );
    });

    it('should handle Date conversion in update with updatedAt field', async () => {
      const updateData = {
        description: 'Updated description',
        updatedAt: new Date('2023-02-01T00:00:00.000Z'), // Use updatedAt em vez de createdAt
      };

      const updatedAttributes = {
        id: mockVideo.id,
        sourceFileKey: mockVideo.sourceFileKey,
        sourceFileName: mockVideo.sourceFileName,
        description: updateData.description,
        status: mockVideo.status,
        createdAt: mockVideo.createdAt.toISOString(),
        updatedAt: updateData.updatedAt.toISOString(),
        userId: mockVideo.userId,
      };

      mockDynamoClient.send.mockResolvedValue({
        Attributes: updatedAttributes,
      });

      await repository.update('test-id-123', updateData);

      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            ExpressionAttributeValues: expect.objectContaining({
              ':updatedAt': expect.any(String), // updatedAt é sempre definido automaticamente
              ':description': updateData.description,
            }),
          }),
        }),
      );
    });

    it('should not update id and createdAt fields', async () => {
      const updateData = {
        id: 'new-id',
        createdAt: new Date('2023-02-01T00:00:00.000Z'),
        description: 'Updated description',
      };

      mockDynamoClient.send.mockResolvedValue({
        Attributes: {
          id: mockVideo.id,
          sourceFileKey: mockVideo.sourceFileKey,
          sourceFileName: mockVideo.sourceFileName,
          description: updateData.description,
          status: mockVideo.status,
          createdAt: mockVideo.createdAt.toISOString(),
          updatedAt: new Date().toISOString(),
          userId: mockVideo.userId,
        },
      });

      await repository.update('test-id-123', updateData);

      const call = mockDynamoClient.send.mock.calls[0][0];
      expect(call.input.ExpressionAttributeValues).not.toHaveProperty(':id');
      expect(call.input.ExpressionAttributeValues).not.toHaveProperty(
        ':createdAt',
      );
      expect(call.input.ExpressionAttributeValues).toHaveProperty(
        ':description',
      );
    });
  });

  describe('delete', () => {
    it('should delete video successfully', async () => {
      mockDynamoClient.send.mockResolvedValue({});

      await repository.delete('test-id-123');

      expect(mockDynamoClient.send).toHaveBeenCalledTimes(1);
      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Key: { id: 'test-id-123' },
          }),
        }),
      );
    });

    it('should handle deletion errors', async () => {
      mockDynamoClient.send.mockRejectedValue(new Error('Delete failed'));

      await expect(repository.delete('test-id-123')).rejects.toThrow(
        'Delete failed',
      );
    });
  });

  describe('toDynamoItem and fromDynamoItem', () => {
    it('should correctly convert Video to DynamoDB item', async () => {
      const videoData = {
        sourceFileKey: 'uploads/test-video.mp4',
        sourceFileName: 'test-video.mp4',
        description: 'Test video description',
        userId: 'user-123',
      };

      mockDynamoClient.send.mockResolvedValue({});

      await repository.create(videoData);

      const putCall = mockDynamoClient.send.mock.calls[0][0];
      const dynamoItem = putCall.input.Item;

      expect(dynamoItem.createdAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
      expect(dynamoItem.updatedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
      expect(dynamoItem.status).toBe(VideoStatus.PENDING);
    });

    it('should correctly convert DynamoDB item to Video', async () => {
      const dynamoItem = {
        id: 'test-id-123',
        sourceFileKey: 'uploads/test-video.mp4',
        sourceFileName: 'test-video.mp4',
        resultFileKey: 'results/processed-video.mp4',
        resultFileName: 'processed-video.mp4',
        description: 'Test video description',
        status: VideoStatus.COMPLETED,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-02T00:00:00.000Z',
        userId: 'user-123',
      };

      mockDynamoClient.send.mockResolvedValue({
        Item: dynamoItem,
      });

      const result = await repository.findById('test-id-123');

      expect(result).toEqual({
        id: 'test-id-123',
        sourceFileKey: 'uploads/test-video.mp4',
        sourceFileName: 'test-video.mp4',
        resultFileKey: 'results/processed-video.mp4',
        resultFileName: 'processed-video.mp4',
        description: 'Test video description',
        status: VideoStatus.COMPLETED,
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-02T00:00:00.000Z'),
        userId: 'user-123',
      });
    });
  });
});
