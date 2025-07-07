import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MediaResultsConsumerService } from '../../../infrastructure/messaging/media-results-consumer.service';
import { MediaResultHandler } from '../../../domain/services/media-result-handler.service';
import { MESSAGE_CONSUMER } from '../../../domain/messaging/message-consumer.interface';

describe('MediaResultsConsumerService', () => {
  let service: MediaResultsConsumerService;
  let mockMessageConsumer: {
    startConsuming: jest.Mock;
    stopConsuming: jest.Mock;
  };
  let mockMediaResultHandler: {
    handle: jest.Mock;
  };
  let mockConfigService: {
    get: jest.Mock;
  };

  beforeEach(async () => {
    mockMessageConsumer = {
      startConsuming: jest.fn().mockResolvedValue(undefined),
      stopConsuming: jest.fn(),
    };

    mockMediaResultHandler = {
      handle: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaResultsConsumerService,
        {
          provide: MESSAGE_CONSUMER,
          useValue: mockMessageConsumer,
        },
        {
          provide: MediaResultHandler,
          useValue: mockMediaResultHandler,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<MediaResultsConsumerService>(
      MediaResultsConsumerService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should start consumer successfully', async () => {
      const mockQueueKey = 'media-results-queue';
      mockConfigService.get.mockReturnValue(mockQueueKey);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.onModuleInit();

      expect(mockConfigService.get).toHaveBeenCalledWith(
        'sqs.mediaResultQueue',
      );
      expect(mockMessageConsumer.startConsuming).toHaveBeenCalledWith(
        mockQueueKey,
        mockMediaResultHandler,
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '🚀 Starting MediaResultsConsumerService for queue: media-results-queue',
      );

      consoleSpy.mockRestore();
    });

    it('should handle consumer start failure', async () => {
      const mockQueueKey = 'media-results-queue';
      const mockError = new Error('Failed to start consumer');

      mockConfigService.get.mockReturnValue(mockQueueKey);
      mockMessageConsumer.startConsuming.mockRejectedValue(mockError);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await service.onModuleInit();

      expect(mockConfigService.get).toHaveBeenCalledWith(
        'sqs.mediaResultQueue',
      );
      expect(mockMessageConsumer.startConsuming).toHaveBeenCalledWith(
        mockQueueKey,
        mockMediaResultHandler,
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Failed to start MediaResultsConsumerService:',
        mockError,
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle missing queue configuration', async () => {
      mockConfigService.get.mockReturnValue(undefined);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.onModuleInit();

      expect(mockConfigService.get).toHaveBeenCalledWith(
        'sqs.mediaResultQueue',
      );
      expect(mockMessageConsumer.startConsuming).toHaveBeenCalledWith(
        undefined,
        mockMediaResultHandler,
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '🚀 Starting MediaResultsConsumerService for queue: undefined',
      );

      consoleSpy.mockRestore();
    });
  });

  describe('onModuleDestroy', () => {
    it('should stop consumer', () => {
      service.onModuleDestroy();

      expect(mockMessageConsumer.stopConsuming).toHaveBeenCalledTimes(1);
    });

    it('should handle stop consumer errors gracefully', () => {
      mockMessageConsumer.stopConsuming.mockImplementation(() => {
        throw new Error('Failed to stop consumer');
      });

      expect(() => service.onModuleDestroy()).toThrow(
        'Failed to stop consumer',
      );
      expect(mockMessageConsumer.stopConsuming).toHaveBeenCalledTimes(1);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete lifecycle', async () => {
      const mockQueueKey = 'integration-test-queue';
      mockConfigService.get.mockReturnValue(mockQueueKey);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Start
      await service.onModuleInit();

      expect(mockMessageConsumer.startConsuming).toHaveBeenCalledWith(
        mockQueueKey,
        mockMediaResultHandler,
      );

      // Stop
      service.onModuleDestroy();

      expect(mockMessageConsumer.stopConsuming).toHaveBeenCalledTimes(1);

      consoleSpy.mockRestore();
    });
  });
});
