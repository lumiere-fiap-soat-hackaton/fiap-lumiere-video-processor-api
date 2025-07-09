import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { MediaEventApplicationHandler } from '../../../application/event-handlers/media-event-application.handler';
import { ProcessMediaFileHandler } from '../../../application/commands/video.handlers';
import { Message } from '../../../domain/messaging/message-consumer.interface';
import {
  MediaEventMessage,
  S3EventRecord,
  SQSRecord,
  S3EventMessage,
} from '../../../domain/messaging/messages/media-event-message';

describe('MediaEventApplicationHandler', () => {
  let handler: MediaEventApplicationHandler;
  let processMediaFileHandler: jest.Mocked<ProcessMediaFileHandler>;
  let loggerSpy: jest.SpyInstance;

  // Helper function to create mock SQS record
  const createMockSQSRecord = (s3Records: S3EventRecord[]): SQSRecord => {
    const s3Event: S3EventMessage = {
      Records: s3Records,
    };

    return {
      messageId: 'test-message-id',
      receiptHandle: 'test-receipt-handle',
      body: JSON.stringify(s3Event),
      attributes: {
        ApproximateReceiveCount: '1',
        SentTimestamp: '1234567890',
        SenderId: 'test-sender',
        ApproximateFirstReceiveTimestamp: '1234567890',
      },
      messageAttributes: {},
      md5OfBody: 'test-md5',
      eventSource: 'aws:sqs',
      eventSourceARN: 'arn:aws:sqs:test',
      awsRegion: 'us-east-1',
    };
  };

  // Helper function to create mock S3 record
  const createMockS3Record = (objectKey: string): S3EventRecord => ({
    eventVersion: '2.1',
    eventSource: 'aws:s3',
    awsRegion: 'us-east-1',
    eventTime: '2025-01-01T00:00:00.000Z',
    eventName: 'ObjectCreated:Put',
    s3: {
      s3SchemaVersion: '1.0',
      bucket: {
        name: 'test-bucket',
        arn: 'arn:aws:s3:::test-bucket',
      },
      object: {
        key: objectKey,
        size: 1024,
        eTag: 'test-etag',
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

    // Mock logger
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should process all S3 event records successfully', async () => {
      // Arrange
      const mockUuid = '123e4567-e89b-12d3-a456-426614174000';
      const mockFileName = 'video.mp4';
      const mockObjectKey = `${mockUuid}-${mockFileName}`;

      const mockS3Record = createMockS3Record(mockObjectKey);
      const mockSQSRecord = createMockSQSRecord([mockS3Record]);

      const mockMessage: Message<MediaEventMessage> = {
        id: 'test-id',
        receiptHandle: 'test-receipt',
        body: {
          Records: [mockSQSRecord],
        },
      };

      processMediaFileHandler.handle.mockResolvedValue(undefined);

      // Act
      await handler.handle(mockMessage);

      // Assert
      expect(processMediaFileHandler.handle).toHaveBeenCalledWith({
        userId: mockUuid,
        sourceFileKey: mockObjectKey,
        sourceFileName: mockObjectKey,
      });
      expect(loggerSpy).toHaveBeenCalledWith(
        `Successfully processed media event for file: ${mockObjectKey}`,
      );
    });

    it('should process multiple S3 event records', async () => {
      // Arrange
      const mockUuid1 = '123e4567-e89b-12d3-a456-426614174000';
      const mockUuid2 = '987e6543-e21b-32d1-a654-246615174111';
      const mockFileName1 = 'video1.mp4';
      const mockFileName2 = 'video2.mp4';
      const mockObjectKey1 = `${mockUuid1}-${mockFileName1}`;
      const mockObjectKey2 = `${mockUuid2}-${mockFileName2}`;

      const mockS3Record1 = createMockS3Record(mockObjectKey1);
      const mockS3Record2 = createMockS3Record(mockObjectKey2);
      const mockSQSRecord = createMockSQSRecord([mockS3Record1, mockS3Record2]);

      const mockMessage: Message<MediaEventMessage> = {
        id: 'test-id',
        receiptHandle: 'test-receipt',
        body: {
          Records: [mockSQSRecord],
        },
      };

      processMediaFileHandler.handle.mockResolvedValue(undefined);

      // Act
      await handler.handle(mockMessage);

      // Assert
      expect(processMediaFileHandler.handle).toHaveBeenCalledTimes(2);
      expect(processMediaFileHandler.handle).toHaveBeenNthCalledWith(1, {
        userId: mockUuid1,
        sourceFileKey: mockObjectKey1,
        sourceFileName: mockObjectKey1,
      });
      expect(processMediaFileHandler.handle).toHaveBeenNthCalledWith(2, {
        userId: mockUuid2,
        sourceFileKey: mockObjectKey2,
        sourceFileName: mockObjectKey2,
      });
    });

    it('should continue processing other records when one fails', async () => {
      // Arrange
      const mockUuid1 = '123e4567-e89b-12d3-a456-426614174000';
      const mockUuid2 = '987e6543-e21b-32d1-a654-246615174111';
      const mockFileName1 = 'video1.mp4';
      const mockFileName2 = 'video2.mp4';
      const mockObjectKey1 = `${mockUuid1}-${mockFileName1}`;
      const mockObjectKey2 = `${mockUuid2}-${mockFileName2}`;

      // Create separate SQS records to test SQS-level failure recovery
      const mockS3Record1 = createMockS3Record(mockObjectKey1);
      const mockS3Record2 = createMockS3Record(mockObjectKey2);
      const mockSQSRecord1 = createMockSQSRecord([mockS3Record1]);
      const mockSQSRecord2 = createMockSQSRecord([mockS3Record2]);

      const mockMessage: Message<MediaEventMessage> = {
        id: 'test-id',
        receiptHandle: 'test-receipt',
        body: {
          Records: [mockSQSRecord1, mockSQSRecord2],
        },
      };

      const mockError = new Error('Processing failed');
      processMediaFileHandler.handle
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce(undefined);

      // Act
      await handler.handle(mockMessage);

      // Assert
      expect(processMediaFileHandler.handle).toHaveBeenCalledTimes(2);
      expect(loggerSpy).toHaveBeenCalledWith(
        `Successfully processed media event for file: ${mockObjectKey2}`,
      );
    });

    it('should skip records without valid UUID', async () => {
      // Arrange
      const mockObjectKey = 'invalid-filename.mp4';

      const mockS3Record = createMockS3Record(mockObjectKey);
      const mockSQSRecord = createMockSQSRecord([mockS3Record]);

      const mockMessage: Message<MediaEventMessage> = {
        id: 'test-id',
        receiptHandle: 'test-receipt',
        body: {
          Records: [mockSQSRecord],
        },
      };

      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      // Act
      await handler.handle(mockMessage);

      // Assert
      expect(warnSpy).toHaveBeenCalledWith(
        `Could not extract user ID from file: ${mockObjectKey}`,
      );
      expect(processMediaFileHandler.handle).not.toHaveBeenCalled();
    });

    it('should handle files with sources/ prefix', async () => {
      // Arrange
      const mockUuid = '123e4567-e89b-12d3-a456-426614174000';
      const mockFileName = 'video.mp4';
      const mockObjectKey = `sources/${mockUuid}-${mockFileName}`;

      const mockS3Record = createMockS3Record(mockObjectKey);
      const mockSQSRecord = createMockSQSRecord([mockS3Record]);

      const mockMessage: Message<MediaEventMessage> = {
        id: 'test-id',
        receiptHandle: 'test-receipt',
        body: {
          Records: [mockSQSRecord],
        },
      };

      processMediaFileHandler.handle.mockResolvedValue(undefined);

      // Act
      await handler.handle(mockMessage);

      // Assert
      expect(processMediaFileHandler.handle).toHaveBeenCalledWith({
        userId: mockUuid,
        sourceFileKey: mockObjectKey,
        sourceFileName: `${mockUuid}-${mockFileName}`,
      });
    });

    it('should handle SQS parsing errors gracefully', async () => {
      // Arrange
      const mockSQSRecord: SQSRecord = {
        messageId: 'test-message-id',
        receiptHandle: 'test-receipt-handle',
        body: 'invalid-json',
        attributes: {
          ApproximateReceiveCount: '1',
          SentTimestamp: '1234567890',
          SenderId: 'test-sender',
          ApproximateFirstReceiveTimestamp: '1234567890',
        },
        messageAttributes: {},
        md5OfBody: 'test-md5',
        eventSource: 'aws:sqs',
        eventSourceARN: 'arn:aws:sqs:test',
        awsRegion: 'us-east-1',
      };

      const mockMessage: Message<MediaEventMessage> = {
        id: 'test-id',
        receiptHandle: 'test-receipt',
        body: {
          Records: [mockSQSRecord],
        },
      };

      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      // Act
      await handler.handle(mockMessage);

      // Assert
      expect(errorSpy).toHaveBeenCalledWith(
        `Failed to process SQS record ${mockSQSRecord.messageId}:`,
        expect.any(Error),
      );
      expect(processMediaFileHandler.handle).not.toHaveBeenCalled();
    });
  });

  describe('extractFileInfo', () => {
    it('should extract UUID and original filename correctly', () => {
      // Arrange
      const mockUuid = '123e4567-e89b-12d3-a456-426614174000';
      const mockOriginalName = 'my-video.mp4';
      const fileName = `${mockUuid}-${mockOriginalName}`;

      // Act
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const result = (handler as any).extractFileInfo(fileName);

      // Assert
      expect(result).toEqual({
        fileName,
        uuid: mockUuid,
        originalFileName: mockOriginalName,
      });
    });

    it('should handle invalid UUID format gracefully', () => {
      // Arrange
      const fileName = 'invalid-uuid-format.mp4';
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      // Act
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const result = (handler as any).extractFileInfo(fileName);

      // Assert
      expect(result).toEqual({
        fileName,
        uuid: '',
        originalFileName: fileName,
      });
      expect(warnSpy).toHaveBeenCalledWith(
        `Could not extract UUID from: ${fileName}`,
      );
    });

    it('should extract filename from object key with prefix', () => {
      // Arrange
      const mockUuid = '123e4567-e89b-12d3-a456-426614174000';
      const mockOriginalName = 'video.mp4';
      const objectKey = `sources/${mockUuid}-${mockOriginalName}`;

      // Act
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const result = (handler as any).extractFileInfo(objectKey);

      // Assert
      expect(result).toEqual({
        fileName: `${mockUuid}-${mockOriginalName}`,
        uuid: mockUuid,
        originalFileName: mockOriginalName,
      });
    });

    it('should handle uppercase UUID format', () => {
      // Arrange
      const mockUuid = '123E4567-E89B-12D3-A456-426614174000';
      const mockOriginalName = 'video.mp4';
      const fileName = `${mockUuid}-${mockOriginalName}`;

      // Act
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const result = (handler as any).extractFileInfo(fileName);

      // Assert
      expect(result).toEqual({
        fileName,
        uuid: mockUuid,
        originalFileName: mockOriginalName,
      });
    });
  });
});
