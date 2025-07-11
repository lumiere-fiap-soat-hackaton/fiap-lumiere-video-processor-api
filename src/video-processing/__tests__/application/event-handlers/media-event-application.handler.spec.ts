import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { MediaEventApplicationHandler } from '../../../application/event-handlers/media-event-application.handler';
import { ProcessMediaFileHandler } from '../../../application/commands/video.handlers';
import { Message } from '../../../domain/messaging/message-consumer.interface';
import {
  MediaEventMessage,
  S3EventRecord,
} from '../../../domain/messaging/messages/media-event-message';

describe('MediaEventApplicationHandler', () => {
  let handler: MediaEventApplicationHandler;
  let processMediaFileHandler: jest.Mocked<ProcessMediaFileHandler>;
  let loggerSpy: jest.SpyInstance;

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

      const mockS3Record: S3EventRecord = {
        s3: {
          object: {
            key: mockObjectKey,
          },
        },
      } as S3EventRecord;

      const mockMessage: Message<MediaEventMessage> = {
        body: {
          Records: [mockS3Record],
        },
      } as Message<MediaEventMessage>;

      processMediaFileHandler.handle.mockResolvedValue(undefined);

      // Act
      await handler.handle(mockMessage);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('Processing 1 S3 event records');
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

      const mockS3Records: S3EventRecord[] = [
        {
          s3: {
            object: {
              key: mockObjectKey1,
            },
          },
        } as S3EventRecord,
        {
          s3: {
            object: {
              key: mockObjectKey2,
            },
          },
        } as S3EventRecord,
      ];

      const mockMessage: Message<MediaEventMessage> = {
        body: {
          Records: mockS3Records,
        },
      } as Message<MediaEventMessage>;

      processMediaFileHandler.handle.mockResolvedValue(undefined);

      // Act
      await handler.handle(mockMessage);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('Processing 2 S3 event records');
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

      const mockS3Records: S3EventRecord[] = [
        {
          s3: {
            object: {
              key: mockObjectKey1,
            },
          },
        } as S3EventRecord,
        {
          s3: {
            object: {
              key: mockObjectKey2,
            },
          },
        } as S3EventRecord,
      ];

      const mockMessage: Message<MediaEventMessage> = {
        body: {
          Records: mockS3Records,
        },
      } as Message<MediaEventMessage>;

      const mockError = new Error('Processing failed');
      processMediaFileHandler.handle
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce(undefined);

      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      // Act
      await handler.handle(mockMessage);

      // Assert
      expect(processMediaFileHandler.handle).toHaveBeenCalledTimes(2);
      expect(errorSpy).toHaveBeenCalledWith(
        `Failed to process record for ${mockObjectKey1}:`,
        mockError,
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        `Successfully processed media event for file: ${mockObjectKey2}`,
      );
    });

    it('should skip records without valid UUID', async () => {
      // Arrange
      const mockObjectKey = 'invalid-filename.mp4';

      const mockS3Record: S3EventRecord = {
        s3: {
          object: {
            key: mockObjectKey,
          },
        },
      } as S3EventRecord;

      const mockMessage: Message<MediaEventMessage> = {
        body: {
          Records: [mockS3Record],
        },
      } as Message<MediaEventMessage>;

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

      const mockS3Record: S3EventRecord = {
        s3: {
          object: {
            key: mockObjectKey,
          },
        },
      } as S3EventRecord;

      const mockMessage: Message<MediaEventMessage> = {
        body: {
          Records: [mockS3Record],
        },
      } as Message<MediaEventMessage>;

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
  });

  describe('extractFileInfo', () => {
    it('should extract UUID and original filename correctly', () => {
      // Arrange
      const mockUuid = '123e4567-e89b-12d3-a456-426614174000';
      const mockOriginalName = 'my-video.mp4';
      const fileName = `${mockUuid}-${mockOriginalName}`;

      // Act
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
