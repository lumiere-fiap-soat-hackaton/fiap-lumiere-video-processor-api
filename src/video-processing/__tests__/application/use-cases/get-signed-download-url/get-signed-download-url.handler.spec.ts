import { Test, TestingModule } from '@nestjs/testing';
import { GetSignedDownloadUrlHandler } from '@app/video-processing/application/use-cases/get-signed-download-url/get-signed-download-url.handler';
import { GetSignedDownloadUrlQuery } from '@app/video-processing/application/use-cases/get-signed-download-url/get-signed-download-url.query';
import { GetSignedDownloadUrlOutput } from '@app/video-processing/application/use-cases/get-signed-download-url/get-signed-download-url.output';
import { IFileStorageService } from '@app/video-processing/application/services/file-storage.interface';
import { mock, MockProxy } from 'jest-mock-extended';

describe('GetSignedDownloadUrlHandler - BDD Tests', () => {
  let handler: GetSignedDownloadUrlHandler;
  let fileStorageService: MockProxy<IFileStorageService>;

  beforeEach(async () => {
    fileStorageService = mock<IFileStorageService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetSignedDownloadUrlHandler,
        {
          provide: IFileStorageService,
          useValue: fileStorageService,
        },
      ],
    }).compile();

    handler = module.get<GetSignedDownloadUrlHandler>(
      GetSignedDownloadUrlHandler,
    );
  });

  describe('Given a user wants to download a video file', () => {
    describe('When the user requests a download URL with valid parameters', () => {
      it('Then should return a valid signed download URL', async () => {
        // Given
        const fileName = 'test-video.mp4';
        const expiresIn = 3600;
        const expectedSignedUrl =
          'https://s3.amazonaws.com/bucket/test-video.mp4?X-Amz-Signature=test';

        const query = new GetSignedDownloadUrlQuery(fileName, expiresIn);

        fileStorageService.getDownloadSignedUrl.mockResolvedValue(
          expectedSignedUrl,
        );

        // When
        const result = await handler.execute(query);

        // Then
        expect(result).toBeInstanceOf(GetSignedDownloadUrlOutput);
        expect(result.signedUrl).toBe(expectedSignedUrl);
        expect(fileStorageService.getDownloadSignedUrl).toHaveBeenCalledWith({
          fileName,
          expiresIn,
        });
        expect(fileStorageService.getDownloadSignedUrl).toHaveBeenCalledTimes(
          1,
        );
      });
    });
  });

  describe('Given the storage service encounters errors', () => {
    describe('When storage service fails', () => {
      it('Then should propagate the error to the caller', async () => {
        // Given
        const fileName = 'test-video.mp4';
        const expiresIn = 3600;
        const query = new GetSignedDownloadUrlQuery(fileName, expiresIn);
        const error = new Error('S3 service error');

        fileStorageService.getDownloadSignedUrl.mockRejectedValue(error);

        // When & Then
        await expect(handler.execute(query)).rejects.toThrow(
          'S3 service error',
        );
        expect(fileStorageService.getDownloadSignedUrl).toHaveBeenCalledWith({
          fileName,
          expiresIn,
        });
      });
    });

    describe('When passing different parameters', () => {
      it('Then should call storage service with correct parameters', async () => {
        // Given
        const fileName = 'another-video.mov';
        const expiresIn = 7200;
        const expectedSignedUrl =
          'https://s3.amazonaws.com/bucket/another-video.mov?signature=test';

        const query = new GetSignedDownloadUrlQuery(fileName, expiresIn);

        fileStorageService.getDownloadSignedUrl.mockResolvedValue(
          expectedSignedUrl,
        );

        // When
        await handler.execute(query);

        // Then
        expect(fileStorageService.getDownloadSignedUrl).toHaveBeenCalledWith({
          fileName: 'another-video.mov',
          expiresIn: 7200,
        });
      });
    });
  });
});
