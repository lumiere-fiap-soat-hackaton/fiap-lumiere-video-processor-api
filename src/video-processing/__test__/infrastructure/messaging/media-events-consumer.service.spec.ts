import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MediaEventsConsumerService } from '../../../infrastructure/messaging/media-events-consumer.service';
import { MediaEventHandler } from '../../../domain/services/media-event-handler.service';
import {
  MessageConsumer,
  MESSAGE_CONSUMER,
} from '../../../domain/messaging/message-consumer.interface';

describe('MediaEventsConsumerService', () => {
  let service: MediaEventsConsumerService;
  let mockMessageConsumer: {
    startConsuming: jest.Mock;
    stopConsuming: jest.Mock;
  };
  let mockMediaEventHandler: {
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

    mockMediaEventHandler = {
      handle: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaEventsConsumerService,
        {
          provide: MESSAGE_CONSUMER,
          useValue: mockMessageConsumer,
        },
        {
          provide: MediaEventHandler,
          useValue: mockMediaEventHandler,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<MediaEventsConsumerService>(
      MediaEventsConsumerService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should start consumer successfully', async () => {
      const mockQueueKey = 'media-events-queue';
      mockConfigService.get.mockReturnValue(mockQueueKey);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.onModuleInit();

      expect(mockConfigService.get).toHaveBeenCalledWith(
        'sqs.mediaEventsQueue',
      );
      expect(mockMessageConsumer.startConsuming).toHaveBeenCalledWith(
        mockQueueKey,
        mockMediaEventHandler,
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '🚀 Starting MediaEventsConsumerService for queue: media-events-queue',
      );

      consoleSpy.mockRestore();
    });

    it('should handle consumer start failure', async () => {
      const mockQueueKey = 'media-events-queue';
      const mockError = new Error('Failed to start consumer');

      mockConfigService.get.mockReturnValue(mockQueueKey);
      mockMessageConsumer.startConsuming.mockRejectedValue(mockError);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await service.onModuleInit();

      expect(mockConfigService.get).toHaveBeenCalledWith(
        'sqs.mediaEventsQueue',
      );
      expect(mockMessageConsumer.startConsuming).toHaveBeenCalledWith(
        mockQueueKey,
        mockMediaEventHandler,
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Failed to start MediaEventsConsumerService:',
        mockError,
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle missing queue configuration', async () => {
      mockConfigService.get.mockReturnValue(undefined);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.onModuleInit();

      expect(mockConfigService.get).toHaveBeenCalledWith(
        'sqs.mediaEventsQueue',
      );
      expect(mockMessageConsumer.startConsuming).toHaveBeenCalledWith(
        undefined,
        mockMediaEventHandler,
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '🚀 Starting MediaEventsConsumerService for queue: undefined',
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
        mockMediaEventHandler,
      );

      // Stop
      service.onModuleDestroy();

      expect(mockMessageConsumer.stopConsuming).toHaveBeenCalledTimes(1);

      consoleSpy.mockRestore();
    });
  });
});
