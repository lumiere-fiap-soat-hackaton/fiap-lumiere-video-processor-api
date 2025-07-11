import { Test, TestingModule } from '@nestjs/testing';
import { mock, MockProxy } from 'jest-mock-extended';
import { GenerateSignedDownloadUrlHandler } from '@app/video-processing/application/use-cases/generate-signed-download-url/generate-signed-download-url.handler';
import { GenerateSignedDownloadUrlCommand } from '@app/video-processing/application/use-cases/generate-signed-download-url/generate-signed-download-url.command';
import { IFileStorageService } from '@app/video-processing/application/services/file-storage.interface';

describe('GenerateSignedDownloadUrlHandler', () => {
  let handler: GenerateSignedDownloadUrlHandler;
  let fileStorageService: MockProxy<IFileStorageService>;

  beforeEach(async () => {
    fileStorageService = mock<IFileStorageService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerateSignedDownloadUrlHandler,
        {
          provide: IFileStorageService,
          useValue: fileStorageService,
        },
      ],
    }).compile();

    handler = module.get<GenerateSignedDownloadUrlHandler>(
      GenerateSignedDownloadUrlHandler,
    );
  });

  describe('Given a user wants to download a video file', () => {
    describe('When requesting a signed download URL', () => {
      it('Then should return a valid signed download URL', async () => {
        // Given
        const resultFileKey = 'video.mp4';
        const expiresIn = 300;
        const command = new GenerateSignedDownloadUrlCommand(
          resultFileKey,
          expiresIn,
        );
        const expectedUrl =
          'https://s3.amazonaws.com/bucket/video.mp4?signature';

        fileStorageService.getDownloadSignedUrl.mockResolvedValue(expectedUrl);

        // When
        const result = await handler.execute(command);

        // Then
        expect(result).toBeDefined();
        expect(result.signedUrl).toBe(expectedUrl);
        expect(fileStorageService.getDownloadSignedUrl).toHaveBeenCalledWith({
          resultFileKey: 'video.mp4',
          expiresIn: 300,
        });
      });
    });

    describe('When file storage service throws an error', () => {
      it('Then should propagate the error', async () => {
        // Given
        const resultFileKey = 'nonexistent.mp4';
        const expiresIn = 300;
        const command = new GenerateSignedDownloadUrlCommand(
          resultFileKey,
          expiresIn,
        );
        const error = new Error('File not found');

        fileStorageService.getDownloadSignedUrl.mockRejectedValue(error);

        // When & Then
        await expect(handler.execute(command)).rejects.toThrow(
          'File not found',
        );
      });
    });
  });
});
