import { Test, TestingModule } from '@nestjs/testing';
import { GetSignedUploadUrlHandler } from '@app/video-processing/application/use-cases/get-signed-upload-url/get-signed-upload-url.handler';
import {
  GetSignedUploadUrlQuery,
  FileData,
} from '@app/video-processing/application/use-cases/get-signed-upload-url/get-signed-upload-url.query';
import { GetSignedUploadUrlOutput } from '@app/video-processing/application/use-cases/get-signed-upload-url/get-signed-upload-url.output';
import { IFileStorageService } from '@app/video-processing/application/services/file-storage.interface';
import { mock, MockProxy } from 'jest-mock-extended';

describe('GetSignedUploadUrlHandler', () => {
  let handler: GetSignedUploadUrlHandler;
  let fileStorageService: MockProxy<IFileStorageService>;

  beforeEach(async () => {
    fileStorageService = mock<IFileStorageService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetSignedUploadUrlHandler,
        {
          provide: IFileStorageService,
          useValue: fileStorageService,
        },
      ],
    }).compile();

    handler = module.get<GetSignedUploadUrlHandler>(GetSignedUploadUrlHandler);
  });

  describe('execute', () => {
    it('should return signed upload URLs for single file successfully', async () => {
      // Arrange
      const fileName = 'test-video.mp4';
      const contentType = 'video/mp4';
      const expiresIn = 3600;
      const expectedSignedUrl =
        'https://s3.amazonaws.com/bucket/test-video.mp4?upload-signature=test';

      const fileData = new FileData(fileName, contentType);
      const query = new GetSignedUploadUrlQuery([fileData], expiresIn);

      fileStorageService.getUploadSignedUrl.mockResolvedValue(
        expectedSignedUrl,
      );

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toBeInstanceOf(GetSignedUploadUrlOutput);
      expect(result.signedUrls).toHaveLength(1);
      expect(result.signedUrls[0]).toEqual({
        fileName: fileName,
        signedUrl: expectedSignedUrl,
      });
      expect(fileStorageService.getUploadSignedUrl).toHaveBeenCalledWith({
        fileName,
        contentType,
        expiresIn,
      });
      expect(fileStorageService.getUploadSignedUrl).toHaveBeenCalledTimes(1);
    });

    it('should return signed upload URLs for multiple files successfully', async () => {
      // Arrange
      const files = [
        new FileData('video1.mp4', 'video/mp4'),
        new FileData('video2.mov', 'video/quicktime'),
        new FileData('video3.avi', 'video/x-msvideo'),
      ];
      const expiresIn = 3600;
      const expectedUrls = [
        'https://s3.amazonaws.com/bucket/video1.mp4?upload-signature=test1',
        'https://s3.amazonaws.com/bucket/video2.mov?upload-signature=test2',
        'https://s3.amazonaws.com/bucket/video3.avi?upload-signature=test3',
      ];

      const query = new GetSignedUploadUrlQuery(files, expiresIn);

      fileStorageService.getUploadSignedUrl
        .mockResolvedValueOnce(expectedUrls[0])
        .mockResolvedValueOnce(expectedUrls[1])
        .mockResolvedValueOnce(expectedUrls[2]);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toBeInstanceOf(GetSignedUploadUrlOutput);
      expect(result.signedUrls).toHaveLength(3);

      files.forEach((file, index) => {
        expect(result.signedUrls[index]).toEqual({
          fileName: file.fileName,
          signedUrl: expectedUrls[index],
        });
      });

      expect(fileStorageService.getUploadSignedUrl).toHaveBeenCalledTimes(3);
      expect(fileStorageService.getUploadSignedUrl).toHaveBeenNthCalledWith(1, {
        fileName: 'video1.mp4',
        contentType: 'video/mp4',
        expiresIn,
      });
      expect(fileStorageService.getUploadSignedUrl).toHaveBeenNthCalledWith(2, {
        fileName: 'video2.mov',
        contentType: 'video/quicktime',
        expiresIn,
      });
      expect(fileStorageService.getUploadSignedUrl).toHaveBeenNthCalledWith(3, {
        fileName: 'video3.avi',
        contentType: 'video/x-msvideo',
        expiresIn,
      });
    });

    it('should handle empty files array', async () => {
      // Arrange
      const files: FileData[] = [];
      const expiresIn = 3600;
      const query = new GetSignedUploadUrlQuery(files, expiresIn);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toBeInstanceOf(GetSignedUploadUrlOutput);
      expect(result.signedUrls).toHaveLength(0);
      expect(fileStorageService.getUploadSignedUrl).not.toHaveBeenCalled();
    });

    it('should handle service errors properly', async () => {
      // Arrange
      const fileName = 'test-video.mp4';
      const contentType = 'video/mp4';
      const expiresIn = 3600;
      const fileData = new FileData(fileName, contentType);
      const query = new GetSignedUploadUrlQuery([fileData], expiresIn);
      const error = new Error('S3 service error');

      fileStorageService.getUploadSignedUrl.mockRejectedValue(error);

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('S3 service error');
      expect(fileStorageService.getUploadSignedUrl).toHaveBeenCalledWith({
        fileName,
        contentType,
        expiresIn,
      });
    });

    it('should handle partial failures with multiple files', async () => {
      // Arrange
      const files = [
        new FileData('video1.mp4', 'video/mp4'),
        new FileData('video2.mov', 'video/quicktime'),
      ];
      const expiresIn = 3600;
      const expectedUrl1 =
        'https://s3.amazonaws.com/bucket/video1.mp4?upload-signature=test1';
      const error = new Error('S3 service error for second file');

      const query = new GetSignedUploadUrlQuery(files, expiresIn);

      fileStorageService.getUploadSignedUrl
        .mockResolvedValueOnce(expectedUrl1)
        .mockRejectedValueOnce(error);

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow(
        'S3 service error for second file',
      );
      expect(fileStorageService.getUploadSignedUrl).toHaveBeenCalledTimes(2);
    });

    it('should pass correct parameters with different expiration times', async () => {
      // Arrange
      const fileName = 'long-term-video.mp4';
      const contentType = 'video/mp4';
      const expiresIn = 86400; // 24 hours
      const expectedSignedUrl =
        'https://s3.amazonaws.com/bucket/long-term-video.mp4?signature=test';

      const fileData = new FileData(fileName, contentType);
      const query = new GetSignedUploadUrlQuery([fileData], expiresIn);

      fileStorageService.getUploadSignedUrl.mockResolvedValue(
        expectedSignedUrl,
      );

      // Act
      await handler.execute(query);

      // Assert
      expect(fileStorageService.getUploadSignedUrl).toHaveBeenCalledWith({
        fileName: 'long-term-video.mp4',
        contentType: 'video/mp4',
        expiresIn: 86400,
      });
    });
  });
});
