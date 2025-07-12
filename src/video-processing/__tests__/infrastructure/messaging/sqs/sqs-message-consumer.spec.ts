import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SqsMessageConsumer } from '../../../../infrastructure/messaging/sqs/sqs-message-consumer';
import { SQS_CLIENT } from '../../../../infrastructure/messaging/sqs/sqs.module';

describe('SqsMessageConsumer', () => {
  let consumer: SqsMessageConsumer;
  let mockSqsClient: {
    send: jest.Mock;
  };
  let mockConfigService: {
    get: jest.Mock;
  };
  let mockHandler: {
    handle: jest.Mock;
  };

  beforeEach(async () => {
    mockSqsClient = {
      send: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn(),
    };

    mockHandler = {
      handle: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SqsMessageConsumer,
        {
          provide: SQS_CLIENT,
          useValue: mockSqsClient,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    consumer = module.get<SqsMessageConsumer>(SqsMessageConsumer);
  });

  afterEach(() => {
    jest.clearAllMocks();
    consumer.stopConsuming();
  });

  describe('stopConsuming', () => {
    it('should stop specific queue consumer', () => {
      const queueName = 'sqs.mediaEventQueue';
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      consumer.stopConsuming(queueName);

      expect(consoleSpy).toHaveBeenCalledWith(
        `Stopping consumer for queue: ${queueName}`,
      );

      consoleSpy.mockRestore();
    });

    it('should stop all consumers when no queue specified', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      consumer.stopConsuming();

      expect(consoleSpy).toHaveBeenCalledWith('Stopping all consumers...');

      consoleSpy.mockRestore();
    });
  });

  describe('startConsuming', () => {
    it('should throw error if consumer for queue is already running', async () => {
      const queueName = 'sqs.mediaEventQueue';

      // Set the running state manually to simulate already running
      consumer['runningConsumers'].set(queueName, true);

      await expect(
        consumer.startConsuming(queueName, mockHandler),
      ).rejects.toThrow(`Consumer for queue ${queueName} is already running`);
    });

    it('should configure queue URL correctly', async () => {
      const queueName = 'media-event-queue';
      const baseUrl = 'http://localhost:4566';

      mockConfigService.get.mockReturnValueOnce(baseUrl); // for sqs.endpoint

      const consoleSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      // Mock the private consumeQueue method to avoid infinite loop
      const originalConsumeQueue = consumer['consumeQueue'];
      consumer['consumeQueue'] = jest.fn().mockImplementation(async () => {});

      // Set consumer as already running to avoid the startConsuming logic
      consumer['runningConsumers'].set(queueName, false);

      try {
        await consumer.startConsuming(queueName, mockHandler);
      } catch {
        // Expected to be stopped before completing
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        `Starting to consume messages from: ${baseUrl}/${queueName}`,
      );

      // Restore original method
      consumer['consumeQueue'] = originalConsumeQueue;
      consoleSpy.mockRestore();
    });
  });

  describe('consumeQueue error handling', () => {
    it('should handle polling errors and sleep', async () => {
      const queueUrl = 'http://localhost:4566/queue/test-queue';
      const queueName = 'test-queue';
      const pollError = new Error('Polling failed');

      // Mock methods to control behavior
      const originalPollMessages = consumer['pollMessages'];
      const originalSleep = consumer['sleep'];

      let pollCalled = false;
      consumer['pollMessages'] = jest.fn().mockImplementation(() => {
        pollCalled = true;
        throw pollError;
      });

      let sleepCalled = false;
      consumer['sleep'] = jest.fn().mockImplementation(() => {
        sleepCalled = true;
        // Stop the consumer after sleep to avoid infinite loop
        consumer['runningConsumers'].set(queueName, false);
      });

      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // Set the consumer as running
      consumer['runningConsumers'].set(queueName, true);

      // Start consuming - this should hit the error path once
      await consumer['consumeQueue'](queueUrl, queueName, mockHandler);

      expect(pollCalled).toBe(true);
      expect(sleepCalled).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Error polling messages from ${queueName}:`,
        pollError,
      );
      expect(consumer['sleep']).toHaveBeenCalledWith(5000);

      // Restore original methods
      consumer['pollMessages'] = originalPollMessages;
      consumer['sleep'] = originalSleep;
      consoleErrorSpy.mockRestore();
    });
  });

  describe('processMessage', () => {
    it('should process message successfully', async () => {
      const mockMessage = {
        MessageId: 'test-message-id',
        Body: JSON.stringify({ test: 'data' }),
        ReceiptHandle: 'test-receipt-handle',
      };

      const queueUrl = 'http://localhost:4566/queue/test-queue';
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Mock deleteMessage method
      const deleteMessageSpy = jest
        .spyOn(consumer as any, 'deleteMessage')
        .mockResolvedValue(undefined);

      await consumer['processMessage'](queueUrl, mockMessage, mockHandler);

      expect(mockHandler.handle).toHaveBeenCalledWith({
        id: 'test-message-id',
        body: { test: 'data' },
        receiptHandle: 'test-receipt-handle',
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Message processed successfully: test-message-id',
      );
      expect(deleteMessageSpy).toHaveBeenCalledWith(
        queueUrl,
        'test-receipt-handle',
      );

      consoleSpy.mockRestore();
      deleteMessageSpy.mockRestore();
    });

    it('should handle processing errors and not delete message', async () => {
      const mockMessage = {
        MessageId: 'test-message-id',
        Body: JSON.stringify({ test: 'data' }),
        ReceiptHandle: 'test-receipt-handle',
      };

      const queueUrl = 'http://localhost:4566/queue/test-queue';
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Make handler throw error
      mockHandler.handle.mockRejectedValue(new Error('Handler error'));

      // Mock deleteMessage method
      const deleteMessageSpy = jest
        .spyOn(consumer as any, 'deleteMessage')
        .mockResolvedValue(undefined);

      await consumer['processMessage'](queueUrl, mockMessage, mockHandler);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to process message test-message-id:',
        expect.any(Error),
      );
      // Should NOT delete message when there's an error
      expect(deleteMessageSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
      deleteMessageSpy.mockRestore();
    });

    it('should handle invalid JSON in message body', async () => {
      const mockMessage = {
        MessageId: 'test-message-id',
        Body: 'invalid-json',
        ReceiptHandle: 'test-receipt-handle',
      };

      const queueUrl = 'http://localhost:4566/queue/test-queue';
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock deleteMessage method
      const deleteMessageSpy = jest
        .spyOn(consumer as any, 'deleteMessage')
        .mockResolvedValue(undefined);

      await consumer['processMessage'](queueUrl, mockMessage, mockHandler);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to process message test-message-id:',
        expect.any(Error),
      );
      // Should NOT delete message when there's a JSON parsing error
      expect(deleteMessageSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
      deleteMessageSpy.mockRestore();
    });
  });

  describe('deleteMessage', () => {
    it('should call SQS client to delete message', async () => {
      const queueUrl = 'http://localhost:4566/queue/test-queue';
      const receiptHandle = 'test-receipt-handle';

      mockSqsClient.send.mockResolvedValue({});

      await consumer['deleteMessage'](queueUrl, receiptHandle);

      expect(mockSqsClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            QueueUrl: queueUrl,
            ReceiptHandle: receiptHandle,
          },
        }),
      );
    });
  });

  describe('pollMessages', () => {
    it('should handle messages when they exist', async () => {
      const queueUrl = 'http://localhost:4566/queue/test-queue';
      const mockMessage = {
        MessageId: 'test-message-id',
        Body: JSON.stringify({ test: 'data' }),
        ReceiptHandle: 'test-receipt-handle',
      };

      mockSqsClient.send.mockResolvedValue({
        Messages: [mockMessage],
        $metadata: {},
      });

      // Mock processMessage to avoid actual processing
      const processMessageSpy = jest
        .spyOn(consumer as any, 'processMessage')
        .mockResolvedValue(undefined);

      await consumer['pollMessages'](queueUrl, mockHandler);

      expect(mockSqsClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            QueueUrl: queueUrl,
            MaxNumberOfMessages: 10,
            WaitTimeSeconds: 20,
            VisibilityTimeout: 30,
          },
        }),
      );
      expect(processMessageSpy).toHaveBeenCalledWith(
        queueUrl,
        mockMessage,
        mockHandler,
      );

      processMessageSpy.mockRestore();
    });

    it('should handle empty message responses', async () => {
      const queueUrl = 'http://localhost:4566/queue/test-queue';

      mockSqsClient.send.mockResolvedValue({
        Messages: [],
        $metadata: {},
      });

      // Mock processMessage to ensure it's not called
      const processMessageSpy = jest
        .spyOn(consumer as any, 'processMessage')
        .mockResolvedValue(undefined);

      await consumer['pollMessages'](queueUrl, mockHandler);

      expect(mockSqsClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            QueueUrl: queueUrl,
            MaxNumberOfMessages: 10,
            WaitTimeSeconds: 20,
            VisibilityTimeout: 30,
          },
        }),
      );
      expect(processMessageSpy).not.toHaveBeenCalled();

      processMessageSpy.mockRestore();
    });
  });

  describe('sleep', () => {
    it('should resolve after specified time', async () => {
      const start = Date.now();
      await consumer['sleep'](10);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(9); // Allow for small timing variations
    });
  });

  describe('integration', () => {
    it('should be defined', () => {
      expect(consumer).toBeDefined();
    });

    it('should have SQS client injected', () => {
      expect(consumer['sqsClient']).toBeDefined();
    });

    it('should have config service injected', () => {
      expect(consumer['configService']).toBeDefined();
    });
  });
});
