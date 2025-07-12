import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DynamoDbVideoRepository } from '../../../infrastructure/repositories/dynamodb-video.repository';
import { DYNAMODB_DOCUMENT_CLIENT } from '../../../infrastructure/database/dynamodb/dynamodb.module';
import { Video, VideoStatus } from '../../../domain/entities/video.entity';

describe('DynamoDbVideoRepository', () => {
  let repository: DynamoDbVideoRepository;
  let mockDynamoDb: {
    send: jest.Mock;
  };
  let mockConfigService: {
    get: jest.Mock;
  };

  const mockTableName = 'test-videos-table';

  const mockVideo: Video = {
    id: 'test-video-id',
    sourceFileKey: 'source/test-video.mp4',
    sourceFileName: 'test-video.mp4',
    resultFileKey: 'result/test-video-processed.mp4',
    resultFileName: 'test-video-processed.mp4',
    description: 'Test video description',
    status: VideoStatus.PENDING,
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-01-01T00:00:00.000Z'),
    userId: 'test-user-id',
  };

  const mockDynamoItem = {
    id: 'test-video-id',
    sourceFileKey: 'source/test-video.mp4',
    sourceFileName: 'test-video.mp4',
    resultFileKey: 'result/test-video-processed.mp4',
    resultFileName: 'test-video-processed.mp4',
    description: 'Test video description',
    status: 'pending',
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
    userId: 'test-user-id',
  };

  beforeEach(async () => {
    mockDynamoDb = {
      send: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn(),
    };

    mockConfigService.get.mockReturnValue(mockTableName);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DynamoDbVideoRepository,
        {
          provide: DYNAMODB_DOCUMENT_CLIENT,
          useValue: mockDynamoDb,
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
      // Arrange
      const videoData = {
        sourceFileKey: 'source/test-video.mp4',
        sourceFileName: 'test-video.mp4',
        description: 'Test video description',
        userId: 'test-user-id',
      };

      const putResult = { $metadata: {} };
      mockDynamoDb.send.mockResolvedValue(putResult);

      // Act
      const result = await repository.create(videoData);

      // Assert
      expect(result).toMatchObject({
        sourceFileKey: videoData.sourceFileKey,
        sourceFileName: videoData.sourceFileName,
        description: videoData.description,
        userId: videoData.userId,
        status: VideoStatus.PENDING,
      });
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(mockDynamoDb.send).toHaveBeenCalledTimes(1);
    });

    it('should throw error when DynamoDB operation fails', async () => {
      // Arrange
      const videoData = {
        sourceFileKey: 'source/test-video.mp4',
        sourceFileName: 'test-video.mp4',
        description: 'Test video description',
        userId: 'test-user-id',
      };

      mockDynamoDb.send.mockRejectedValue(new Error('DynamoDB error'));

      // Act & Assert
      await expect(repository.create(videoData)).rejects.toThrow(
        'Failed to create video',
      );
    });
  });

  describe('findById', () => {
    it('should return video when found', async () => {
      // Arrange
      const queryResult = {
        Items: [mockDynamoItem],
        Count: 1,
        $metadata: {},
      };

      mockDynamoDb.send.mockResolvedValue(queryResult);

      // Act
      const result = await repository.findById('test-video-id');

      // Assert
      expect(result).toEqual(mockVideo);
      expect(mockDynamoDb.send).toHaveBeenCalledTimes(1);
    });

    it('should return null when video not found', async () => {
      // Arrange
      const queryResult = {
        Items: [],
        Count: 0,
        $metadata: {},
      };

      mockDynamoDb.send.mockResolvedValue(queryResult);

      // Act
      const result = await repository.findById('non-existent-id');

      // Assert
      expect(result).toBeNull();
    });

    it('should throw error for invalid id', async () => {
      // Act & Assert
      await expect(repository.findById('')).rejects.toThrow(
        'Invalid id provided for findById',
      );
    });

    it('should throw error when DynamoDB operation fails', async () => {
      // Arrange
      mockDynamoDb.send.mockRejectedValue(new Error('DynamoDB error'));

      // Act & Assert
      await expect(repository.findById('test-video-id')).rejects.toThrow(
        'DynamoDB error',
      );
    });
  });

  describe('findByUserId', () => {
    it('should return videos for a user', async () => {
      // Arrange
      const scanResult = {
        Items: [mockDynamoItem],
        Count: 1,
        $metadata: {},
      };

      mockDynamoDb.send.mockResolvedValue(scanResult);

      // Act
      const result = await repository.findByUserId('test-user-id');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockVideo);
      expect(mockDynamoDb.send).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no videos found', async () => {
      // Arrange
      const scanResult = {
        Items: [],
        Count: 0,
        $metadata: {},
      };

      mockDynamoDb.send.mockResolvedValue(scanResult);

      // Act
      const result = await repository.findByUserId('test-user-id');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should handle multiple videos for the same user', async () => {
      // Arrange
      const video2 = { ...mockDynamoItem, id: 'video-2' };
      const scanResult = {
        Items: [mockDynamoItem, video2],
        Count: 2,
        $metadata: {},
      };

      mockDynamoDb.send.mockResolvedValue(scanResult);

      // Act
      const result = await repository.findByUserId('test-user-id');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe('test-user-id');
      expect(result[1].userId).toBe('test-user-id');
    });
  });

  describe('findByStatus', () => {
    it('should return videos with specific status', async () => {
      // Arrange
      const scanResult = {
        Items: [mockDynamoItem],
        Count: 1,
        $metadata: {},
      };

      mockDynamoDb.send.mockResolvedValue(scanResult);

      // Act
      const result = await repository.findByStatus('pending');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockVideo);
      expect(result[0].status).toBe(VideoStatus.PENDING);
    });

    it('should return empty array when no videos with status found', async () => {
      // Arrange
      const scanResult = {
        Items: [],
        Count: 0,
        $metadata: {},
      };

      mockDynamoDb.send.mockResolvedValue(scanResult);

      // Act
      const result = await repository.findByStatus('completed');

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('findAll', () => {
    it('should return all videos', async () => {
      // Arrange
      const scanResult = {
        Items: [mockDynamoItem],
        Count: 1,
        $metadata: {},
      };

      mockDynamoDb.send.mockResolvedValue(scanResult);

      // Act
      const result = await repository.findAll();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockVideo);
    });

    it('should return empty array when no videos exist', async () => {
      // Arrange
      const scanResult = {
        Items: [],
        Count: 0,
        $metadata: {},
      };

      mockDynamoDb.send.mockResolvedValue(scanResult);

      // Act
      const result = await repository.findAll();

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should return multiple videos', async () => {
      // Arrange
      const video2 = { ...mockDynamoItem, id: 'video-2', userId: 'user-2' };
      const video3 = { ...mockDynamoItem, id: 'video-3', status: 'completed' };
      const scanResult = {
        Items: [mockDynamoItem, video2, video3],
        Count: 3,
        $metadata: {},
      };

      mockDynamoDb.send.mockResolvedValue(scanResult);

      // Act
      const result = await repository.findAll();

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('test-video-id');
      expect(result[1].id).toBe('video-2');
      expect(result[2].id).toBe('video-3');
    });
  });

  describe('update', () => {
    beforeEach(() => {
      // Mock successful findById for all update tests
      const queryResult = {
        Items: [mockDynamoItem],
        Count: 1,
        $metadata: {},
      };
      mockDynamoDb.send.mockResolvedValueOnce(queryResult);
    });

    it('should update video successfully', async () => {
      // Arrange
      const updateData = {
        status: VideoStatus.COMPLETED,
        resultFileKey: 'result/updated-video.mp4',
      };

      const updatedItem = {
        ...mockDynamoItem,
        status: 'completed',
        resultFileKey: 'result/updated-video.mp4',
        updatedAt: new Date().toISOString(),
      };

      const updateResult = {
        Attributes: updatedItem,
        $metadata: {},
      };

      mockDynamoDb.send.mockResolvedValueOnce(updateResult);

      // Act
      const result = await repository.update('test-video-id', updateData);

      // Assert
      expect(result.status).toBe(VideoStatus.COMPLETED);
      expect(result.resultFileKey).toBe('result/updated-video.mp4');
      expect(mockDynamoDb.send).toHaveBeenCalledTimes(2);
    });

    it('should throw error for invalid id', async () => {
      // Act & Assert
      await expect(repository.update('', {})).rejects.toThrow(
        'Invalid id provided for update',
      );
    });

    it('should throw error for empty update data', async () => {
      // Act & Assert
      await expect(repository.update('test-video-id', {})).rejects.toThrow(
        'No data provided for update',
      );
    });

    it('should throw error when video not found', async () => {
      // Arrange - override the beforeEach mock
      mockDynamoDb.send.mockReset();
      const queryResult = {
        Items: [],
        Count: 0,
        $metadata: {},
      };
      mockDynamoDb.send.mockResolvedValue(queryResult);

      // Act & Assert
      await expect(
        repository.update('non-existent-id', { status: VideoStatus.COMPLETED }),
      ).rejects.toThrow('Video with id non-existent-id not found');
    });

    it('should use alternative update method when schema error occurs', async () => {
      // Arrange
      const updateData = { status: VideoStatus.COMPLETED };

      const queryResult = {
        Items: [mockDynamoItem],
        Count: 1,
        $metadata: {},
      };

      const schemaError = new Error('does not match the schema');
      const putResult = { $metadata: {} };

      // Reset and setup specific mock sequence
      mockDynamoDb.send.mockReset();
      mockDynamoDb.send
        .mockResolvedValueOnce(queryResult) // findById call
        .mockRejectedValueOnce(schemaError) // update call fails
        .mockResolvedValueOnce(queryResult) // findById call in alternative method
        .mockResolvedValueOnce(putResult); // PUT call succeeds

      // Act
      const result = await repository.update('test-video-id', updateData);

      // Assert
      expect(result.status).toBe(VideoStatus.COMPLETED);
      expect(mockDynamoDb.send).toHaveBeenCalledTimes(4);
    });

    it('should handle Date objects in update data', async () => {
      // Arrange
      const updateData = {
        status: VideoStatus.COMPLETED,
        updatedAt: new Date('2023-02-01T00:00:00.000Z'),
      };

      const updatedItem = {
        ...mockDynamoItem,
        status: 'completed',
        updatedAt: '2023-02-01T00:00:00.000Z',
      };

      const updateResult = {
        Attributes: updatedItem,
        $metadata: {},
      };

      mockDynamoDb.send.mockResolvedValueOnce(updateResult);

      // Act
      const result = await repository.update('test-video-id', updateData);

      // Assert
      expect(result.status).toBe(VideoStatus.COMPLETED);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('updateAlternative', () => {
    it('should update video using PUT method', async () => {
      // Arrange
      const updateData = { status: VideoStatus.COMPLETED };

      const queryResult = {
        Items: [mockDynamoItem],
        Count: 1,
        $metadata: {},
      };

      const putResult = { $metadata: {} };

      mockDynamoDb.send
        .mockResolvedValueOnce(queryResult) // findById call
        .mockResolvedValueOnce(putResult); // PUT call

      // Act
      const result = await repository.updateAlternative(
        'test-video-id',
        updateData,
      );

      // Assert
      expect(result.status).toBe(VideoStatus.COMPLETED);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(mockDynamoDb.send).toHaveBeenCalledTimes(2);
    });

    it('should throw error when video not found', async () => {
      // Arrange
      const queryResult = {
        Items: [],
        Count: 0,
        $metadata: {},
      };

      mockDynamoDb.send.mockResolvedValue(queryResult);

      // Act & Assert
      await expect(
        repository.updateAlternative('non-existent-id', {
          status: VideoStatus.COMPLETED,
        }),
      ).rejects.toThrow('Video with id non-existent-id not found');
    });

    it('should preserve existing data when updating', async () => {
      // Arrange
      const updateData = { status: VideoStatus.COMPLETED };

      const queryResult = {
        Items: [mockDynamoItem],
        Count: 1,
        $metadata: {},
      };

      const putResult = { $metadata: {} };

      mockDynamoDb.send
        .mockResolvedValueOnce(queryResult)
        .mockResolvedValueOnce(putResult);

      // Act
      const result = await repository.updateAlternative(
        'test-video-id',
        updateData,
      );

      // Assert
      expect(result.id).toBe(mockVideo.id);
      expect(result.sourceFileKey).toBe(mockVideo.sourceFileKey);
      expect(result.sourceFileName).toBe(mockVideo.sourceFileName);
      expect(result.description).toBe(mockVideo.description);
      expect(result.userId).toBe(mockVideo.userId);
      expect(result.status).toBe(VideoStatus.COMPLETED);
      expect(result.createdAt).toEqual(mockVideo.createdAt);
    });
  });

  describe('delete', () => {
    it('should delete video successfully', async () => {
      // Arrange
      const deleteResult = { $metadata: {} };
      mockDynamoDb.send.mockResolvedValue(deleteResult);

      // Act
      await repository.delete('test-video-id');

      // Assert
      expect(mockDynamoDb.send).toHaveBeenCalledTimes(1);
    });

    it('should throw error for invalid id', async () => {
      // Act & Assert
      await expect(repository.delete('')).rejects.toThrow(
        'Invalid id provided for delete',
      );
    });

    it('should handle DynamoDB errors during delete', async () => {
      // Arrange
      mockDynamoDb.send.mockRejectedValue(new Error('DynamoDB error'));

      // Act & Assert
      await expect(repository.delete('test-video-id')).rejects.toThrow(
        'DynamoDB operation failed: DynamoDB error',
      );
    });
  });

  describe('data conversion', () => {
    it('should handle video with minimal required fields', async () => {
      // Arrange
      const minimalVideoData = {
        sourceFileKey: 'minimal/video.mp4',
        sourceFileName: 'video.mp4',
        userId: 'user-123',
      };

      const putResult = { $metadata: {} };
      mockDynamoDb.send.mockResolvedValue(putResult);

      // Act
      const result = await repository.create(minimalVideoData);

      // Assert
      expect(result.sourceFileKey).toBe(minimalVideoData.sourceFileKey);
      expect(result.sourceFileName).toBe(minimalVideoData.sourceFileName);
      expect(result.userId).toBe(minimalVideoData.userId);
      expect(result.description).toBeUndefined();
      expect(result.resultFileKey).toBeUndefined();
      expect(result.resultFileName).toBeUndefined();
      expect(result.status).toBe(VideoStatus.PENDING);
    });

    it('should convert status enum correctly', async () => {
      // Arrange
      const completedItem = {
        ...mockDynamoItem,
        status: 'completed',
      };

      const queryResult = {
        Items: [completedItem],
        Count: 1,
        $metadata: {},
      };

      mockDynamoDb.send.mockResolvedValue(queryResult);

      // Act
      const result = await repository.findById('test-video-id');

      // Assert
      expect(result?.status).toBe(VideoStatus.COMPLETED);
    });

    it('should handle missing optional fields in DynamoDB item', async () => {
      // Arrange
      const minimalItem = {
        id: 'minimal-video',
        sourceFileKey: 'source/minimal.mp4',
        sourceFileName: 'minimal.mp4',
        status: 'pending',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
        userId: 'user-123',
        // Missing: resultFileKey, resultFileName, description
      };

      const queryResult = {
        Items: [minimalItem],
        Count: 1,
        $metadata: {},
      };

      mockDynamoDb.send.mockResolvedValue(queryResult);

      // Act
      const result = await repository.findById('minimal-video');

      // Assert
      expect(result?.id).toBe('minimal-video');
      expect(result?.resultFileKey).toBeUndefined();
      expect(result?.resultFileName).toBeUndefined();
      expect(result?.description).toBeUndefined();
    });
  });
});
