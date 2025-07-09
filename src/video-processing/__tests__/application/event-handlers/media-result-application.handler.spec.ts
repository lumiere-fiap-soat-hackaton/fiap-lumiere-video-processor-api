import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { MediaResultApplicationHandler } from '../../../application/event-handlers/media-result-application.handler';
import { UpdateVideoStatusHandler } from '../../../application/commands/video.handlers';
import { Message } from '../../../domain/messaging/message-consumer.interface';
import {
  MediaResultMessage,
  MediaResultMessageStatus,
} from '../../../domain/messaging/messages/media-result-message';
import { VideoStatus } from '../../../domain/entities/video.entity';

describe('MediaResultApplicationHandler', () => {
  let handler: MediaResultApplicationHandler;
  let updateVideoStatusHandler: jest.Mocked<UpdateVideoStatusHandler>;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    const mockUpdateVideoStatusHandler = {
      handle: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaResultApplicationHandler,
        {
          provide: UpdateVideoStatusHandler,
          useValue: mockUpdateVideoStatusHandler,
        },
      ],
    }).compile();

    handler = module.get<MediaResultApplicationHandler>(
      MediaResultApplicationHandler,
    );
    updateVideoStatusHandler = module.get(UpdateVideoStatusHandler);

    // Mock logger
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should process successful media result message', async () => {
      // Arrange
      const mockVideoId = 'video-123';
      const mockResultFileKey = 'results/processed-video.mp4';
      const mockMessage: Message<MediaResultMessage> = {
        body: {
          id: mockVideoId,
          status: MediaResultMessageStatus.SUCCESS,
          resultFileKey: mockResultFileKey,
        },
      } as Message<MediaResultMessage>;

      updateVideoStatusHandler.handle.mockResolvedValue(undefined);

      // Act
      await handler.handle(mockMessage);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        `Processing media result for video ID: ${mockVideoId}`,
      );
      expect(updateVideoStatusHandler.handle).toHaveBeenCalledWith({
        videoId: mockVideoId,
        status: VideoStatus.COMPLETED,
        resultFileKey: mockResultFileKey,
        resultFileName: 'processed-video.mp4',
      });
      expect(loggerSpy).toHaveBeenCalledWith(
        `Successfully processed media result for video ID: ${mockVideoId}`,
      );
    });

    it('should process failed media result message', async () => {
      // Arrange
      const mockVideoId = 'video-456';
      const mockMessage: Message<MediaResultMessage> = {
        body: {
          id: mockVideoId,
          status: MediaResultMessageStatus.FAILED,
          resultFileKey: null,
        },
      } as Message<MediaResultMessage>;

      updateVideoStatusHandler.handle.mockResolvedValue(undefined);

      // Act
      await handler.handle(mockMessage);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        `Processing media result for video ID: ${mockVideoId}`,
      );
      expect(updateVideoStatusHandler.handle).toHaveBeenCalledWith({
        videoId: mockVideoId,
        status: VideoStatus.FAILED,
        resultFileKey: null,
        resultFileName: undefined,
      });
      expect(loggerSpy).toHaveBeenCalledWith(
        `Successfully processed media result for video ID: ${mockVideoId}`,
      );
    });

    it('should handle message without result file key', async () => {
      // Arrange
      const mockVideoId = 'video-789';
      const mockMessage: Message<MediaResultMessage> = {
        body: {
          id: mockVideoId,
          status: MediaResultMessageStatus.SUCCESS,
        },
      } as Message<MediaResultMessage>;

      updateVideoStatusHandler.handle.mockResolvedValue(undefined);

      // Act
      await handler.handle(mockMessage);

      // Assert
      expect(updateVideoStatusHandler.handle).toHaveBeenCalledWith({
        videoId: mockVideoId,
        status: VideoStatus.COMPLETED,
        resultFileKey: undefined,
        resultFileName: undefined,
      });
    });

    it('should handle result file key with path prefix', async () => {
      // Arrange
      const mockVideoId = 'video-101';
      const mockResultFileKey = 'processed/subfolder/final-video.mp4';
      const mockMessage: Message<MediaResultMessage> = {
        body: {
          id: mockVideoId,
          status: MediaResultMessageStatus.SUCCESS,
          resultFileKey: mockResultFileKey,
        },
      } as Message<MediaResultMessage>;

      updateVideoStatusHandler.handle.mockResolvedValue(undefined);

      // Act
      await handler.handle(mockMessage);

      // Assert
      expect(updateVideoStatusHandler.handle).toHaveBeenCalledWith({
        videoId: mockVideoId,
        status: VideoStatus.COMPLETED,
        resultFileKey: mockResultFileKey,
        resultFileName: 'final-video.mp4',
      });
    });

    it('should log error and re-throw when update handler fails', async () => {
      // Arrange
      const mockVideoId = 'video-error';
      const mockMessage: Message<MediaResultMessage> = {
        body: {
          id: mockVideoId,
          status: MediaResultMessageStatus.SUCCESS,
          resultFileKey: 'result.mp4',
        },
      } as Message<MediaResultMessage>;

      const mockError = new Error('Update failed');
      updateVideoStatusHandler.handle.mockRejectedValue(mockError);

      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      // Act & Assert
      await expect(handler.handle(mockMessage)).rejects.toThrow(
        'Update failed',
      );
      expect(errorSpy).toHaveBeenCalledWith(
        `Failed to process media result for video ID: ${mockVideoId}`,
        mockError,
      );
    });

    it('should handle empty result file key', async () => {
      // Arrange
      const mockVideoId = 'video-empty';
      const mockMessage: Message<MediaResultMessage> = {
        body: {
          id: mockVideoId,
          status: MediaResultMessageStatus.SUCCESS,
          resultFileKey: '',
        },
      } as Message<MediaResultMessage>;

      updateVideoStatusHandler.handle.mockResolvedValue(undefined);

      // Act
      await handler.handle(mockMessage);

      // Assert
      expect(updateVideoStatusHandler.handle).toHaveBeenCalledWith({
        videoId: mockVideoId,
        status: VideoStatus.COMPLETED,
        resultFileKey: '',
        resultFileName: undefined,
      });
    });
  });

  describe('mapToVideoStatus', () => {
    it('should map SUCCESS to COMPLETED', () => {
      // Act
      const result = (handler as any).mapToVideoStatus(
        MediaResultMessageStatus.SUCCESS,
      );

      // Assert
      expect(result).toBe(VideoStatus.COMPLETED);
    });

    it('should map FAILED to FAILED', () => {
      // Act
      const result = (handler as any).mapToVideoStatus(
        MediaResultMessageStatus.FAILED,
      );

      // Assert
      expect(result).toBe(VideoStatus.FAILED);
    });
  });
});
