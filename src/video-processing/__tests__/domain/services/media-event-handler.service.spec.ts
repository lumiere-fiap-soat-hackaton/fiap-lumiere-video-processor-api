import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MediaEventHandler } from '../../../domain/services/media-event-handler.service';
import { MESSAGE_PUBLISHER } from '../../../domain/messaging/message-publisher.interface';
import { VIDEO_REPOSITORY } from '../../../domain/repositories/video.repository';
import {
  MediaEventMessage,
  S3EventRecord,
} from '../../../domain/messaging/messages/media-event-message';
import { Message } from '../../../domain/messaging/message-consumer.interface';
import { Video, VideoStatus } from '../../../domain/entities/video.entity';

describe('MediaEventHandler', () => {
  let handler: MediaEventHandler;
  let mockMessagePublisher: {
    publish: jest.Mock;
  };
  let mockVideoRepository: {
    create: jest.Mock;
  };
  let mockConfigService: {
    get: jest.Mock;
  };

  const mockVideo: Video = {
    id: 'test-video-123',
    sourceFileKey: 'sources/123e4567-e89b-12d3-a456-426614174000-video.mp4',
    sourceFileName: '123e4567-e89b-12d3-a456-426614174000-video.mp4',
    description: undefined,
    status: VideoStatus.PENDING,
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-01-01T00:00:00.000Z'),
    userId: '123e4567-e89b-12d3-a456-426614174000',
  };

  const mockS3EventRecord: S3EventRecord = {
    eventVersion: '2.1',
    eventSource: 'aws:s3',
    awsRegion: 'us-east-1',
    eventTime: '2023-01-01T00:00:00.000Z',
    eventName: 's3:ObjectCreated:Put',
    s3: {
      s3SchemaVersion: '1.0',
      configurationId: 'test-config',
      bucket: {
        name: 'test-bucket',
        ownerIdentity: {
          principalId: 'test-principal',
        },
        arn: 'arn:aws:s3:::test-bucket',
      },
      object: {
        key: 'sources/123e4567-e89b-12d3-a456-426614174000-video.mp4',
        size: 1024,
        eTag: 'test-etag',
        sequencer: 'test-sequencer',
      },
    },
  };

  const createMessage = (
    records: S3EventRecord[],
  ): Message<MediaEventMessage> => ({
    id: 'message-123',
    receiptHandle: 'receipt-handle-123',
    body: {
      Records: records,
    },
  });

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
        MediaEventHandler,
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

    handler = module.get<MediaEventHandler>(MediaEventHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should process single record successfully', async () => {
      mockVideoRepository.create.mockResolvedValue(mockVideo);
      mockConfigService.get.mockReturnValue('process-queue');
      mockMessagePublisher.publish.mockResolvedValue('message-id');

      const message = createMessage([mockS3EventRecord]);
      await handler.handle(message);

      expect(mockVideoRepository.create).toHaveBeenCalledTimes(1);
      expect(mockVideoRepository.create).toHaveBeenCalledWith({
        userId: '123e4567-e89b-12d3-a456-426614174000',
        sourceFileKey: 'sources/123e4567-e89b-12d3-a456-426614174000-video.mp4',
        sourceFileName: '123e4567-e89b-12d3-a456-426614174000-video.mp4',
      });

      expect(mockConfigService.get).toHaveBeenCalledWith('sqs.processQueueKey');
      expect(mockMessagePublisher.publish).toHaveBeenCalledWith(
        'process-queue',
        mockVideo,
      );
    });

    it('should process multiple records successfully', async () => {
      const record2: S3EventRecord = {
        ...mockS3EventRecord,
        s3: {
          ...mockS3EventRecord.s3,
          object: {
            ...mockS3EventRecord.s3.object,
            key: 'sources/987fcdeb-51a2-43d7-b890-123456789abc-another-video.mp4',
          },
        },
      };

      const video1 = { ...mockVideo, id: 'video-1' };
      const video2 = {
        ...mockVideo,
        id: 'video-2',
        userId: '987fcdeb-51a2-43d7-b890-123456789abc',
      };

      mockVideoRepository.create
        .mockResolvedValueOnce(video1)
        .mockResolvedValueOnce(video2);
      mockConfigService.get.mockReturnValue('process-queue');
      mockMessagePublisher.publish.mockResolvedValue('message-id');

      const message = createMessage([mockS3EventRecord, record2]);
      await handler.handle(message);

      expect(mockVideoRepository.create).toHaveBeenCalledTimes(2);
      expect(mockMessagePublisher.publish).toHaveBeenCalledTimes(2);
    });

    it('should continue processing other records when one fails', async () => {
      const record2: S3EventRecord = {
        ...mockS3EventRecord,
        s3: {
          ...mockS3EventRecord.s3,
          object: {
            ...mockS3EventRecord.s3.object,
            key: 'sources/987fcdeb-51a2-43d7-b890-123456789abc-another-video.mp4',
          },
        },
      };

      const video2 = {
        ...mockVideo,
        id: 'video-2',
        userId: '987fcdeb-51a2-43d7-b890-123456789abc',
      };

      mockVideoRepository.create
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce(video2);
      mockConfigService.get.mockReturnValue('process-queue');
      mockMessagePublisher.publish.mockResolvedValue('message-id');

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const message = createMessage([mockS3EventRecord, record2]);
      await handler.handle(message);

      expect(mockVideoRepository.create).toHaveBeenCalledTimes(2);
      expect(mockMessagePublisher.publish).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to process record for sources/123e4567-e89b-12d3-a456-426614174000-video.mp4:',
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it('should handle empty records array', async () => {
      const message = createMessage([]);
      await handler.handle(message);

      expect(mockVideoRepository.create).not.toHaveBeenCalled();
      expect(mockMessagePublisher.publish).not.toHaveBeenCalled();
    });
  });

  describe('extractFileInfo', () => {
    it('should extract UUID and filename correctly', async () => {
      const objectKey =
        'sources/12345678-1234-1234-1234-123456789012-video.mp4';
      mockVideoRepository.create.mockResolvedValue(mockVideo);
      mockConfigService.get.mockReturnValue('process-queue');
      mockMessagePublisher.publish.mockResolvedValue('message-id');

      const record = {
        ...mockS3EventRecord,
        s3: {
          ...mockS3EventRecord.s3,
          object: {
            ...mockS3EventRecord.s3.object,
            key: objectKey,
          },
        },
      };

      const message = createMessage([record]);
      await handler.handle(message);

      expect(mockVideoRepository.create).toHaveBeenCalledWith({
        userId: '12345678-1234-1234-1234-123456789012',
        sourceFileKey: objectKey,
        sourceFileName: '12345678-1234-1234-1234-123456789012-video.mp4',
      });
    });

    it('should handle filename without UUID pattern', async () => {
      const objectKey = 'sources/simple-video.mp4';
      mockVideoRepository.create.mockResolvedValue(mockVideo);
      mockConfigService.get.mockReturnValue('process-queue');
      mockMessagePublisher.publish.mockResolvedValue('message-id');

      const record = {
        ...mockS3EventRecord,
        s3: {
          ...mockS3EventRecord.s3,
          object: {
            ...mockS3EventRecord.s3.object,
            key: objectKey,
          },
        },
      };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const message = createMessage([record]);
      await handler.handle(message);

      expect(mockVideoRepository.create).toHaveBeenCalledWith({
        userId: '',
        sourceFileKey: objectKey,
        sourceFileName: 'simple-video.mp4',
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Could not extract UUID from: simple-video.mp4',
      );

      consoleSpy.mockRestore();
    });

    it('should handle filename without path prefix', async () => {
      const objectKey = '123e4567-e89b-12d3-a456-426614174000-video.mp4';
      mockVideoRepository.create.mockResolvedValue(mockVideo);
      mockConfigService.get.mockReturnValue('process-queue');
      mockMessagePublisher.publish.mockResolvedValue('message-id');

      const record = {
        ...mockS3EventRecord,
        s3: {
          ...mockS3EventRecord.s3,
          object: {
            ...mockS3EventRecord.s3.object,
            key: objectKey,
          },
        },
      };

      const message = createMessage([record]);
      await handler.handle(message);

      expect(mockVideoRepository.create).toHaveBeenCalledWith({
        userId: '123e4567-e89b-12d3-a456-426614174000',
        sourceFileKey: objectKey,
        sourceFileName: objectKey,
      });
    });

    it('should handle edge case with empty filename extraction', async () => {
      // Simulando um caso extremo onde split('/').pop() poderia ser undefined
      const objectKey = '';
      mockVideoRepository.create.mockResolvedValue(mockVideo);
      mockConfigService.get.mockReturnValue('process-queue');
      mockMessagePublisher.publish.mockResolvedValue('message-id');

      const record = {
        ...mockS3EventRecord,
        s3: {
          ...mockS3EventRecord.s3,
          object: {
            ...mockS3EventRecord.s3.object,
            key: objectKey,
          },
        },
      };

      const message = createMessage([record]);
      await handler.handle(message);

      expect(mockVideoRepository.create).toHaveBeenCalledWith({
        userId: '',
        sourceFileKey: objectKey,
        sourceFileName: objectKey,
      });
    });
  });

  describe('error handling', () => {
    it('should handle repository creation errors', async () => {
      const error = new Error('Database connection failed');
      mockVideoRepository.create.mockRejectedValue(error);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const message = createMessage([mockS3EventRecord]);
      await handler.handle(message);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to process record for sources/123e4567-e89b-12d3-a456-426614174000-video.mp4:',
        error,
      );

      consoleSpy.mockRestore();
    });

    it('should handle message publisher errors', async () => {
      mockVideoRepository.create.mockResolvedValue(mockVideo);
      mockConfigService.get.mockReturnValue('process-queue');
      mockMessagePublisher.publish.mockRejectedValue(
        new Error('Publisher error'),
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const message = createMessage([mockS3EventRecord]);
      await handler.handle(message);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to process record for sources/123e4567-e89b-12d3-a456-426614174000-video.mp4:',
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it('should handle config service errors', async () => {
      mockVideoRepository.create.mockResolvedValue(mockVideo);
      mockConfigService.get.mockReturnValue(undefined);
      mockMessagePublisher.publish.mockResolvedValue('message-id');

      const message = createMessage([mockS3EventRecord]);
      await handler.handle(message);

      expect(mockMessagePublisher.publish).toHaveBeenCalledWith(
        undefined,
        mockVideo,
      );
    });
  });

  describe('integration', () => {
    it('should be defined', () => {
      expect(handler).toBeDefined();
    });

    it('should have all dependencies injected', () => {
      expect(handler['messagePublisher']).toBeDefined();
      expect(handler['videoRepository']).toBeDefined();
      expect(handler['configService']).toBeDefined();
    });

    it('should implement MessageHandler interface', () => {
      expect(typeof handler.handle).toBe('function');
    });
  });
});
