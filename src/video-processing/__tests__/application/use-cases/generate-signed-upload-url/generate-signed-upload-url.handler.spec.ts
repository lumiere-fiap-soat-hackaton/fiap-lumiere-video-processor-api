import { Test, TestingModule } from '@nestjs/testing';
import { mock, MockProxy } from 'jest-mock-extended';
import { GenerateSignedUploadUrlHandler } from '@app/video-processing/application/use-cases/generate-signed-upload-url/generate-signed-upload-url.handler';
import { GenerateSignedUploadUrlCommand } from '@app/video-processing/application/use-cases/generate-signed-upload-url/generate-signed-upload-url.command';
import { IFileStorageService } from '@app/video-processing/application/services/file-storage.interface';

describe('GenerateSignedUploadUrlHandler', () => {
  let handler: GenerateSignedUploadUrlHandler;
  let fileStorageService: MockProxy<IFileStorageService>;

  beforeEach(async () => {
    fileStorageService = mock<IFileStorageService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerateSignedUploadUrlHandler,
        {
          provide: IFileStorageService,
          useValue: fileStorageService,
        },
      ],
    }).compile();

    handler = module.get<GenerateSignedUploadUrlHandler>(
      GenerateSignedUploadUrlHandler,
    );
  });

  describe('Given a user wants to upload video files', () => {
    describe('When requesting signed upload URLs for a single file', () => {
      it('Then should return a valid signed upload URL', async () => {
        // Given
        const userId = 'test-user-id';
        const files = [{ fileName: 'video.mp4', contentType: 'video/mp4' }];
        const expiresIn = 300;
        const command = new GenerateSignedUploadUrlCommand(
          userId,
          files,
          expiresIn,
        );
        const expectedUrl =
          'https://s3.amazonaws.com/bucket/test-user-id--video.mp4?signature';

        fileStorageService.getUploadSignedUrl.mockResolvedValue(expectedUrl);

        // When
        const result = await handler.execute(command);

        // Then
        expect(result).toBeDefined();
        expect(result.signedUrls).toHaveLength(1);
        expect(result.signedUrls[0]).toEqual({
          fileName: 'test-user-id--video.mp4',
          signedUrl: expectedUrl,
        });
        expect(fileStorageService.getUploadSignedUrl).toHaveBeenCalledWith({
          fileName: 'test-user-id--video.mp4',
          contentType: 'video/mp4',
          expiresIn: 300,
        });
      });
    });

    describe('When requesting signed upload URLs for multiple files', () => {
      it('Then should return valid signed upload URLs for all files', async () => {
        // Given
        const userId = 'test-user-id';
        const files = [
          { fileName: 'video1.mp4', contentType: 'video/mp4' },
          { fileName: 'video2.avi', contentType: 'video/avi' },
        ];
        const expiresIn = 300;
        const command = new GenerateSignedUploadUrlCommand(
          userId,
          files,
          expiresIn,
        );
        const expectedUrls = [
          'https://s3.amazonaws.com/bucket/test-user-id--video1.mp4?signature1',
          'https://s3.amazonaws.com/bucket/test-user-id--video2.avi?signature2',
        ];

        fileStorageService.getUploadSignedUrl
          .mockResolvedValueOnce(expectedUrls[0])
          .mockResolvedValueOnce(expectedUrls[1]);

        // When
        const result = await handler.execute(command);

        // Then
        expect(result).toBeDefined();
        expect(result.signedUrls).toHaveLength(2);
        expect(result.signedUrls[0]).toEqual({
          fileName: 'test-user-id--video1.mp4',
          signedUrl: expectedUrls[0],
        });
        expect(result.signedUrls[1]).toEqual({
          fileName: 'test-user-id--video2.avi',
          signedUrl: expectedUrls[1],
        });
        expect(fileStorageService.getUploadSignedUrl).toHaveBeenCalledTimes(2);
      });
    });

    describe('When file storage service throws an error', () => {
      it('Then should propagate the error', async () => {
        // Given
        const userId = 'test-user-id';
        const files = [{ fileName: 'video.mp4', contentType: 'video/mp4' }];
        const expiresIn = 300;
        const command = new GenerateSignedUploadUrlCommand(
          userId,
          files,
          expiresIn,
        );
        const error = new Error('S3 service unavailable');

        fileStorageService.getUploadSignedUrl.mockRejectedValue(error);

        // When & Then
        await expect(handler.execute(command)).rejects.toThrow(
          'S3 service unavailable',
        );
      });
    });
  });
});
