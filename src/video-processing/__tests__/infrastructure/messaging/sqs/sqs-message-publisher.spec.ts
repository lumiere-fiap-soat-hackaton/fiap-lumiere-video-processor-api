import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SqsMessagePublisher } from '../../../../infrastructure/messaging/sqs/sqs-message-publisher';
import { SQS_CLIENT } from '../../../../infrastructure/messaging/sqs/sqs.module';

describe('SqsMessagePublisher', () => {
  let publisher: SqsMessagePublisher;
  let mockSqsClient: {
    send: jest.Mock;
  };
  let mockConfigService: {
    get: jest.Mock;
  };

  beforeEach(async () => {
    mockSqsClient = {
      send: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SqsMessagePublisher,
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

    publisher = module.get<SqsMessagePublisher>(SqsMessagePublisher);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('publish', () => {
    it('should publish message successfully', async () => {
      const queueName = 'media-event-queue';
      const messageBody = { videoId: 'test-123', action: 'process' };

      mockConfigService.get.mockReturnValueOnce('http://localhost:4566');

      mockSqsClient.send.mockResolvedValue({
        MessageId: 'msg-123',
        MD5OfBody: 'abc123',
      });

      const result = await publisher.publish(queueName, messageBody);

      expect(mockConfigService.get).toHaveBeenCalledWith('sqs.endpoint');
      expect(mockSqsClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            QueueUrl: `http://localhost:4566/${queueName}`,
            MessageBody: JSON.stringify(messageBody),
          }),
        }),
      );
      expect(result).toBe('msg-123');
    });

    it('should handle SQS errors', async () => {
      const queueName = 'media-event-queue';
      const messageBody = { videoId: 'test-123' };

      mockConfigService.get.mockReturnValueOnce('http://localhost:4566');

      mockSqsClient.send.mockRejectedValue(new Error('SQS Error'));

      await expect(publisher.publish(queueName, messageBody)).rejects.toThrow(
        `Failed to publish message to ${queueName}: SQS Error`,
      );
    });

    it('should return empty string when MessageId is undefined', async () => {
      const queueName = 'sqs.mediaEventQueue';
      const messageBody = { videoId: 'test-123' };

      mockConfigService.get
        .mockReturnValueOnce('http://localhost:4566')
        .mockReturnValueOnce('media-events-queue');

      mockSqsClient.send.mockResolvedValue({
        MD5OfBody: 'abc123',
      });

      const result = await publisher.publish(queueName, messageBody);

      expect(result).toBe('');
    });
  });
});
