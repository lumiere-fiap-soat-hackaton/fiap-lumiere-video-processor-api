import { Test, TestingModule } from '@nestjs/testing';
import { MediaResultHandler } from '../../../domain/services/media-result-handler.service';
import { VIDEO_REPOSITORY } from '../../../domain/repositories/video.repository';
import {
  MediaResultMessage,
  MediaResultMessageStatus,
} from '../../../domain/messaging/messages/media-result-message';
import { Message } from '../../../domain/messaging/message-consumer.interface';
import { Video, VideoStatus } from '../../../domain/entities/video.entity';

describe('MediaResultHandler', () => {
  let handler: MediaResultHandler;
  let mockVideoRepository: {
    findById: jest.Mock;
    update: jest.Mock;
  };
  let mockLogger: {
    log: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
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

  const createMessage = (
    body: MediaResultMessage,
  ): Message<MediaResultMessage> => ({
    id: 'message-123',
    receiptHandle: 'receipt-123',
    body,
  });

  beforeEach(async () => {
    mockVideoRepository = {
      findById: jest.fn(),
      update: jest.fn(),
    };

    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaResultHandler,
        {
          provide: VIDEO_REPOSITORY,
          useValue: mockVideoRepository,
        },
      ],
    }).compile();

    handler = module.get<MediaResultHandler>(MediaResultHandler);

    // Mock the logger
    Object.defineProperty(handler, 'logger', {
      value: mockLogger,
      writable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should handle SUCCESS status and update video to COMPLETED', async () => {
      const resultMessage: MediaResultMessage = {
        request_id: 'test-video-123',
        status: MediaResultMessageStatus.SUCCESS,
        result_s3_path: 'results/processed-video.mp4',
      };

      const updatedVideo = {
        ...mockVideo,
        status: VideoStatus.COMPLETED,
        resultFileKey: 'results/processed-video.mp4',
        resultFileName: 'processed-video.mp4',
      };

      mockVideoRepository.findById.mockResolvedValue(mockVideo);
      mockVideoRepository.update.mockResolvedValue(updatedVideo);

      const message = createMessage(resultMessage);
      await handler.handle(message);

      expect(mockVideoRepository.findById).toHaveBeenCalledWith(
        'test-video-123',
      );
      expect(mockVideoRepository.update).toHaveBeenCalledWith(
        'test-video-123',
        {
          status: VideoStatus.COMPLETED,
          resultFileKey: 'results/processed-video.mp4',
          resultFileName: 'processed-video.mp4',
        },
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Successfully processed media result for request_id: test-video-123',
      );
    });

    it('should handle FAILED status and update video to FAILED', async () => {
      const resultMessage: MediaResultMessage = {
        request_id: 'test-video-123',
        status: MediaResultMessageStatus.FAILED,
        result_s3_path: 'results/error-log.txt',
      };

      const updatedVideo = {
        ...mockVideo,
        status: VideoStatus.FAILED,
        resultFileKey: 'results/error-log.txt',
        resultFileName: 'error-log.txt',
      };

      mockVideoRepository.findById.mockResolvedValue(mockVideo);
      mockVideoRepository.update.mockResolvedValue(updatedVideo);

      const message = createMessage(resultMessage);
      await handler.handle(message);

      expect(mockVideoRepository.findById).toHaveBeenCalledWith(
        'test-video-123',
      );
      expect(mockVideoRepository.update).toHaveBeenCalledWith(
        'test-video-123',
        {
          status: VideoStatus.FAILED,
          resultFileKey: 'results/error-log.txt',
          resultFileName: 'error-log.txt',
        },
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Successfully processed media result for request_id: test-video-123',
      );
    });

    it('should handle NO_FRAMES_EXTRACTED status', async () => {
      const resultMessage: MediaResultMessage = {
        request_id: 'test-video-123',
        status: MediaResultMessageStatus.NO_FRAMES_EXTRACTED,
        result_s3_path: 'results/no-frames.txt',
      };

      mockVideoRepository.findById.mockResolvedValue(mockVideo);
      mockVideoRepository.update.mockResolvedValue(mockVideo);

      const message = createMessage(resultMessage);
      await handler.handle(message);

      expect(mockVideoRepository.update).toHaveBeenCalledWith(
        'test-video-123',
        {
          status: VideoStatus.FAILED,
          resultFileKey: 'results/no-frames.txt',
          resultFileName: 'no-frames.txt',
        },
      );
    });

    it('should handle video not found', async () => {
      const resultMessage: MediaResultMessage = {
        request_id: 'non-existent-video',
        status: MediaResultMessageStatus.SUCCESS,
        result_s3_path: 'results/processed-video.mp4',
      };

      mockVideoRepository.findById.mockResolvedValue(null);

      const message = createMessage(resultMessage);
      await handler.handle(message);

      expect(mockVideoRepository.findById).toHaveBeenCalledWith(
        'non-existent-video',
      );
      expect(mockVideoRepository.update).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Video with request_id non-existent-video not found. Message will be acknowledged.',
      );
    });

    it('should handle repository errors', async () => {
      const resultMessage: MediaResultMessage = {
        request_id: 'test-video-123',
        status: MediaResultMessageStatus.SUCCESS,
        result_s3_path: 'results/processed-video.mp4',
      };

      const error = new Error('Database connection failed');
      mockVideoRepository.findById.mockRejectedValue(error);

      const message = createMessage(resultMessage);

      await expect(handler.handle(message)).rejects.toThrow(
        'Database connection failed',
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to process media result for request_id: test-video-123',
        error,
      );
    });
  });
});
