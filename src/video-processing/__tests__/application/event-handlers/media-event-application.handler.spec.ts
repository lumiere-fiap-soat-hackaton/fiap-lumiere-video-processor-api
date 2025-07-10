import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { MediaEventApplicationHandler } from '../../../application/event-handlers/media-event-application.handler';
import { ProcessMediaFileHandler } from '../../../application/commands/video.handlers';
import { Message } from '../../../domain/messaging/message-consumer.interface';
import {
  SQSMessageBody,
  SQSMessageS3EventRecord,
} from '../../../domain/messaging/messages/sqs-message.interface';

describe('MediaEventApplicationHandler', () => {
  let handler: MediaEventApplicationHandler;
  let processMediaFileHandler: jest.Mocked<ProcessMediaFileHandler>;
  let loggerSpy: jest.SpyInstance;

  // Helper function to create mock SQS message body
  const createMockSQSMessageBody = (
    s3Records: SQSMessageS3EventRecord[],
  ): SQSMessageBody => ({
    Records: s3Records,
  });

  // Helper function to create mock S3 event record
  const createMockS3EventRecord = (
    objectKey: string,
  ): SQSMessageS3EventRecord => ({
    eventVersion: '2.1',
    eventSource: 'aws:s3',
    awsRegion: 'us-east-1',
    eventTime: '2025-01-01T00:00:00.000Z',
    eventName: 'ObjectCreated:Put',
    userIdentity: {
      principalId: 'test-principal',
    },
    requestParameters: {
      sourceIPAddress: '127.0.0.1',
    },
    responseElements: {
      'x-amz-request-id': 'test-request-id',
      'x-amz-id-2': 'test-id-2',
    },
    s3: {
      s3SchemaVersion: '1.0',
      configurationId: 'test-config',
      bucket: {
        name: 'test-bucket',
        ownerIdentity: {
          principalId: 'test-owner',
        },
        arn: 'arn:aws:s3:::test-bucket',
      },
      object: {
        key: objectKey,
        size: 1024,
        eTag: 'test-etag',
        sequencer: 'test-sequencer',
      },
    },
  });

  beforeEach(async () => {
    const mockProcessMediaFileHandler = {
      handle: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaEventApplicationHandler,
        {
          provide: ProcessMediaFileHandler,
          useValue: mockProcessMediaFileHandler,
        },
      ],
    }).compile();

    handler = module.get<MediaEventApplicationHandler>(
      MediaEventApplicationHandler,
    );
    processMediaFileHandler = module.get(ProcessMediaFileHandler);

    // Spy on logger methods
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('handle', () => {
    it('should process a valid SQS message with S3 event', async () => {
      // Arrange
      const mockObjectKey =
        'videos/123e4567-e89b-12d3-a456-426614174000-test-video.mp4';
      const mockUuid = '123e4567-e89b-12d3-a456-426614174000';

      const mockS3Record = createMockS3EventRecord(mockObjectKey);
      const mockSQSBody = createMockSQSMessageBody([mockS3Record]);

      const mockMessage: Message<SQSMessageBody> = {
        id: 'test-message-id',
        body: mockSQSBody,
        receiptHandle: 'test-receipt-handle',
      };

      processMediaFileHandler.handle.mockResolvedValue(undefined);

      // Act
      await handler.handle(mockMessage);

      // Assert
      expect(processMediaFileHandler.handle).toHaveBeenCalledWith({
        userId: mockUuid,
        sourceFileKey: mockObjectKey,
        sourceFileName: '123e4567-e89b-12d3-a456-426614174000-test-video.mp4',
      });
    });

    it('should handle message with nested Body field', async () => {
      // Arrange
      const mockObjectKey =
        'videos/123e4567-e89b-12d3-a456-426614174000-test-video.mp4';
      const mockUuid = '123e4567-e89b-12d3-a456-426614174000';

      const mockS3Record = createMockS3EventRecord(mockObjectKey);
      const mockSQSBody = createMockSQSMessageBody([mockS3Record]);

      // Simulate nested Body structure
      const mockMessage: Message<any> = {
        id: 'test-message-id',
        body: {
          Body: JSON.stringify(mockSQSBody),
          MessageId: 'nested-id',
        },
        receiptHandle: 'test-receipt-handle',
      };

      processMediaFileHandler.handle.mockResolvedValue(undefined);

      // Act
      await handler.handle(mockMessage);

      // Assert
      expect(processMediaFileHandler.handle).toHaveBeenCalledWith({
        userId: mockUuid,
        sourceFileKey: mockObjectKey,
        sourceFileName: '123e4567-e89b-12d3-a456-426614174000-test-video.mp4',
      });
    });

    it('should handle invalid message format', async () => {
      // Arrange
      const mockMessage: Message<any> = {
        id: 'test-message-id',
        body: { invalid: 'data' }, // No Records field
        receiptHandle: 'test-receipt-handle',
      };

      const loggerErrorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();

      // Act
      await handler.handle(mockMessage);

      // Assert
      expect(processMediaFileHandler.handle).not.toHaveBeenCalled();
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Invalid message format: missing Records array',
        { invalid: 'data' },
      );
    });
  });
});
