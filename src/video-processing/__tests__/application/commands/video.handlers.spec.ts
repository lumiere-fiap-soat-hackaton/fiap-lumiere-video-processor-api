import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  ProcessMediaFileHandler,
  UpdateVideoStatusHandler,
} from '../../../application/commands/video.handlers';
import {
  MessagePublisher,
  MESSAGE_PUBLISHER,
} from '../../../domain/messaging/message-publisher.interface';
import {
  VideoRepository,
  VIDEO_REPOSITORY,
} from '../../../domain/repositories/video.repository';
import { VideoStatus } from '../../../domain/entities/video.entity';
import {
  ProcessMediaFileCommand,
  UpdateVideoStatusCommand,
} from '../../../application/commands/video.commands';

describe('ProcessMediaFileHandler', () => {
  let handler: ProcessMediaFileHandler;
  let mockMessagePublisher: {
    publish: jest.Mock;
  };
  let mockVideoRepository: {
    create: jest.Mock;
  };
  let mockConfigService: {
    get: jest.Mock;
  };

  beforeEach(async () => {
    mockMessagePublisher = {
      publish: jest.fn(),
    };

    mockVideoRepository = {
      create: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessMediaFileHandler,
        {
          provide: MESSAGE_PUBLISHER,
          useValue: mockMessagePublisher,
        },
        {
          provide: VIDEO_REPOSITORY,
          useValue: mockVideoRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    handler = module.get<ProcessMediaFileHandler>(ProcessMediaFileHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should create video and publish to processing queue successfully', async () => {
      // Arrange
      const command: ProcessMediaFileCommand = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        sourceFileKey: 'sources/123e4567-e89b-12d3-a456-426614174000-video.mp4',
        sourceFileName: '123e4567-e89b-12d3-a456-426614174000-video.mp4',
      };

      const mockVideo = {
        id: 'video-id-123',
        userId: command.userId,
        sourceFileKey: command.sourceFileKey,
        sourceFileName: command.sourceFileName,
        status: VideoStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const processQueueKey = 'process-queue';

      mockVideoRepository.create.mockResolvedValue(mockVideo);
      mockConfigService.get.mockReturnValue(processQueueKey);
      mockMessagePublisher.publish.mockResolvedValue('message-id-123');

      // Act
      await handler.handle(command);

      // Assert
      expect(mockVideoRepository.create).toHaveBeenCalledWith({
        userId: command.userId,
        sourceFileKey: command.sourceFileKey,
        sourceFileName: command.sourceFileName,
      });

      expect(mockConfigService.get).toHaveBeenCalledWith(
        'sqs.mediaProcessQueue',
      );

      expect(mockMessagePublisher.publish).toHaveBeenCalledWith(
        processQueueKey,
        mockVideo,
      );
    });

    it('should handle video creation failure', async () => {
      // Arrange
      const command: ProcessMediaFileCommand = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        sourceFileKey: 'sources/123e4567-e89b-12d3-a456-426614174000-video.mp4',
        sourceFileName: '123e4567-e89b-12d3-a456-426614174000-video.mp4',
      };

      const error = new Error('Database connection failed');
      mockVideoRepository.create.mockRejectedValue(error);

      // Act & Assert
      await expect(handler.handle(command)).rejects.toThrow(
        'Database connection failed',
      );

      expect(mockVideoRepository.create).toHaveBeenCalledWith({
        userId: command.userId,
        sourceFileKey: command.sourceFileKey,
        sourceFileName: command.sourceFileName,
      });

      expect(mockConfigService.get).not.toHaveBeenCalled();
      expect(mockMessagePublisher.publish).not.toHaveBeenCalled();
    });

    it('should handle message publishing failure', async () => {
      // Arrange
      const command: ProcessMediaFileCommand = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        sourceFileKey: 'sources/123e4567-e89b-12d3-a456-426614174000-video.mp4',
        sourceFileName: '123e4567-e89b-12d3-a456-426614174000-video.mp4',
      };

      const mockVideo = {
        id: 'video-id-123',
        userId: command.userId,
        sourceFileKey: command.sourceFileKey,
        sourceFileName: command.sourceFileName,
        status: VideoStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const processQueueKey = 'process-queue';
      const publishError = new Error('Failed to publish message');

      mockVideoRepository.create.mockResolvedValue(mockVideo);
      mockConfigService.get.mockReturnValue(processQueueKey);
      mockMessagePublisher.publish.mockRejectedValue(publishError);

      // Act & Assert
      await expect(handler.handle(command)).rejects.toThrow(
        'Failed to publish message',
      );

      expect(mockVideoRepository.create).toHaveBeenCalledWith({
        userId: command.userId,
        sourceFileKey: command.sourceFileKey,
        sourceFileName: command.sourceFileName,
      });

      expect(mockConfigService.get).toHaveBeenCalledWith(
        'sqs.mediaProcessQueue',
      );

      expect(mockMessagePublisher.publish).toHaveBeenCalledWith(
        processQueueKey,
        mockVideo,
      );
    });

    it('should handle missing queue configuration', async () => {
      // Arrange
      const command: ProcessMediaFileCommand = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        sourceFileKey: 'sources/123e4567-e89b-12d3-a456-426614174000-video.mp4',
        sourceFileName: '123e4567-e89b-12d3-a456-426614174000-video.mp4',
      };

      const mockVideo = {
        id: 'video-id-123',
        userId: command.userId,
        sourceFileKey: command.sourceFileKey,
        sourceFileName: command.sourceFileName,
        status: VideoStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockVideoRepository.create.mockResolvedValue(mockVideo);
      mockConfigService.get.mockReturnValue(undefined);
      mockMessagePublisher.publish.mockResolvedValue('message-id-123');

      // Act
      await handler.handle(command);

      // Assert
      expect(mockVideoRepository.create).toHaveBeenCalledWith({
        userId: command.userId,
        sourceFileKey: command.sourceFileKey,
        sourceFileName: command.sourceFileName,
      });

      expect(mockConfigService.get).toHaveBeenCalledWith(
        'sqs.mediaProcessQueue',
      );

      expect(mockMessagePublisher.publish).toHaveBeenCalledWith(
        undefined,
        mockVideo,
      );
    });
  });
});

describe('UpdateVideoStatusHandler', () => {
  let handler: UpdateVideoStatusHandler;
  let mockVideoRepository: {
    update: jest.Mock;
  };

  beforeEach(async () => {
    mockVideoRepository = {
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateVideoStatusHandler,
        {
          provide: VIDEO_REPOSITORY,
          useValue: mockVideoRepository,
        },
      ],
    }).compile();

    handler = module.get<UpdateVideoStatusHandler>(UpdateVideoStatusHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should update video status with all fields successfully', async () => {
      // Arrange
      const command: UpdateVideoStatusCommand = {
        videoId: 'video-id-123',
        status: VideoStatus.COMPLETED,
        resultFileKey: 'results/video-id-123-processed.mp4',
        resultFileName: 'video-id-123-processed.mp4',
      };

      mockVideoRepository.update.mockResolvedValue(undefined);

      // Act
      await handler.handle(command);

      // Assert
      expect(mockVideoRepository.update).toHaveBeenCalledWith('video-id-123', {
        status: VideoStatus.COMPLETED,
        resultFileKey: 'results/video-id-123-processed.mp4',
        resultFileName: 'video-id-123-processed.mp4',
      });
    });

    it('should update video status without optional fields', async () => {
      // Arrange
      const command: UpdateVideoStatusCommand = {
        videoId: 'video-id-123',
        status: VideoStatus.FAILED,
      };

      mockVideoRepository.update.mockResolvedValue(undefined);

      // Act
      await handler.handle(command);

      // Assert
      expect(mockVideoRepository.update).toHaveBeenCalledWith('video-id-123', {
        status: VideoStatus.FAILED,
      });
    });

    it('should update video status with only resultFileKey', async () => {
      // Arrange
      const command: UpdateVideoStatusCommand = {
        videoId: 'video-id-123',
        status: VideoStatus.COMPLETED,
        resultFileKey: 'results/video-id-123-processed.mp4',
      };

      mockVideoRepository.update.mockResolvedValue(undefined);

      // Act
      await handler.handle(command);

      // Assert
      expect(mockVideoRepository.update).toHaveBeenCalledWith('video-id-123', {
        status: VideoStatus.COMPLETED,
        resultFileKey: 'results/video-id-123-processed.mp4',
      });
    });

    it('should update video status with only resultFileName', async () => {
      // Arrange
      const command: UpdateVideoStatusCommand = {
        videoId: 'video-id-123',
        status: VideoStatus.COMPLETED,
        resultFileName: 'video-id-123-processed.mp4',
      };

      mockVideoRepository.update.mockResolvedValue(undefined);

      // Act
      await handler.handle(command);

      // Assert
      expect(mockVideoRepository.update).toHaveBeenCalledWith('video-id-123', {
        status: VideoStatus.COMPLETED,
        resultFileName: 'video-id-123-processed.mp4',
      });
    });

    it('should handle repository update failure', async () => {
      // Arrange
      const command: UpdateVideoStatusCommand = {
        videoId: 'video-id-123',
        status: VideoStatus.FAILED,
      };

      const error = new Error('Database update failed');
      mockVideoRepository.update.mockRejectedValue(error);

      // Act & Assert
      await expect(handler.handle(command)).rejects.toThrow(
        'Database update failed',
      );

      expect(mockVideoRepository.update).toHaveBeenCalledWith('video-id-123', {
        status: VideoStatus.FAILED,
      });
    });

    it('should handle different video status values', async () => {
      // Arrange
      const testCases = [
        VideoStatus.PENDING,
        VideoStatus.COMPLETED,
        VideoStatus.FAILED,
      ];

      mockVideoRepository.update.mockResolvedValue(undefined);

      // Act & Assert
      for (const status of testCases) {
        const command: UpdateVideoStatusCommand = {
          videoId: 'video-id-123',
          status,
        };

        await handler.handle(command);

        expect(mockVideoRepository.update).toHaveBeenCalledWith(
          'video-id-123',
          {
            status,
          },
        );
      }

      expect(mockVideoRepository.update).toHaveBeenCalledTimes(
        testCases.length,
      );
    });
  });
});
