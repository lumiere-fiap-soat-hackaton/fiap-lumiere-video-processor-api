import { Test, TestingModule } from '@nestjs/testing';
import { QueryBus } from '@nestjs/cqrs';
import { HttpException, HttpStatus } from '@nestjs/common';
import { UserRecordsController } from '@app/video-processing/api/controllers/user-records.controller';
import { GetVideosByUserQuery } from '@app/video-processing/application/use-cases/get-videos-by-user/get-videos-by-user.query';
import {
  Video,
  VideoStatus,
} from '@app/video-processing/domain/entities/video.entity';
import { mock, MockProxy } from 'jest-mock-extended';

describe('UserRecordsController', () => {
  let controller: UserRecordsController;
  let queryBus: MockProxy<QueryBus>;

  const mockVideos: Video[] = [
    {
      id: 'video-1',
      sourceFileKey: 'uploads/video1.mp4',
      sourceFileName: 'video1.mp4',
      description: 'Test video 1',
      status: VideoStatus.COMPLETED,
      createdAt: new Date('2023-01-01T00:00:00.000Z'),
      updatedAt: new Date('2023-01-01T00:00:00.000Z'),
      userId: 'user-123',
    },
    {
      id: 'video-2',
      sourceFileKey: 'uploads/video2.mp4',
      sourceFileName: 'video2.mp4',
      description: 'Test video 2',
      status: VideoStatus.PENDING,
      createdAt: new Date('2023-01-02T00:00:00.000Z'),
      updatedAt: new Date('2023-01-02T00:00:00.000Z'),
      userId: 'user-123',
    },
  ];

  beforeEach(async () => {
    queryBus = mock<QueryBus>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserRecordsController],
      providers: [
        {
          provide: QueryBus,
          useValue: queryBus,
        },
      ],
    }).compile();

    controller = module.get<UserRecordsController>(UserRecordsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserRecords', () => {
    it('should return videos for valid user ID', async () => {
      // Given
      const userId = 'user-123';
      const mockRequest = {
        headers: { 'x-user-id': userId },
        query: {},
        body: {},
        method: 'GET',
        url: '/api/v1/user-records',
      };

      queryBus.execute.mockResolvedValue(mockVideos);

      // When
      const result = await controller.getUserRecords(
        userId,
        mockRequest as any,
      );

      // Then
      expect(result).toHaveLength(2);
      expect(result).toEqual(mockVideos);
      expect(queryBus.execute).toHaveBeenCalledWith(
        new GetVideosByUserQuery(userId),
      );
    });

    it('should return empty array when user has no videos', async () => {
      // Given
      const userId = 'user-without-videos';
      const mockRequest = {
        headers: { 'x-user-id': userId },
        query: {},
        body: {},
        method: 'GET',
        url: '/api/v1/user-records',
      };

      queryBus.execute.mockResolvedValue([]);

      // When
      const result = await controller.getUserRecords(
        userId,
        mockRequest as any,
      );

      // Then
      expect(result).toEqual([]);
      expect(queryBus.execute).toHaveBeenCalledWith(
        new GetVideosByUserQuery(userId),
      );
    });

    it('should throw BadRequest when user ID is undefined', async () => {
      // Given
      const userId = undefined;
      const mockRequest = {
        headers: {},
        query: {},
        body: {},
        method: 'GET',
        url: '/api/v1/user-records',
      };

      // When & Then
      await expect(
        controller.getUserRecords(userId, mockRequest as any),
      ).rejects.toThrow(
        new HttpException(
          'Header x-user-id é obrigatório',
          HttpStatus.BAD_REQUEST,
        ),
      );

      expect(queryBus.execute).not.toHaveBeenCalled();
    });

    it('should throw BadRequest when user ID is empty string', async () => {
      // Given
      const userId = '';
      const mockRequest = {
        headers: { 'x-user-id': '' },
        query: {},
        body: {},
        method: 'GET',
        url: '/api/v1/user-records',
      };

      // When & Then
      await expect(
        controller.getUserRecords(userId, mockRequest as any),
      ).rejects.toThrow(
        new HttpException(
          'Header x-user-id é obrigatório',
          HttpStatus.BAD_REQUEST,
        ),
      );

      expect(queryBus.execute).not.toHaveBeenCalled();
    });

    it('should propagate database errors', async () => {
      // Given
      const userId = 'user-123';
      const mockRequest = {
        headers: { 'x-user-id': userId },
        query: {},
        body: {},
        method: 'GET',
        url: '/api/v1/user-records',
      };

      const databaseError = new Error('Database connection failed');
      queryBus.execute.mockRejectedValue(databaseError);

      // When & Then
      await expect(
        controller.getUserRecords(userId, mockRequest as any),
      ).rejects.toThrow('Database connection failed');

      expect(queryBus.execute).toHaveBeenCalledWith(
        new GetVideosByUserQuery(userId),
      );
    });

    it('should return videos with different statuses', async () => {
      // Given
      const userId = 'user-456';
      const mixedStatusVideos: Video[] = [
        {
          id: 'video-pending',
          sourceFileKey: 'uploads/pending.mp4',
          sourceFileName: 'pending.mp4',
          description: 'Pending video',
          status: VideoStatus.PENDING,
          createdAt: new Date('2023-01-01T00:00:00.000Z'),
          updatedAt: new Date('2023-01-01T00:00:00.000Z'),
          userId: 'user-456',
        },
        {
          id: 'video-completed',
          sourceFileKey: 'uploads/completed.mp4',
          sourceFileName: 'completed.mp4',
          description: 'Completed video',
          status: VideoStatus.COMPLETED,
          createdAt: new Date('2023-01-02T00:00:00.000Z'),
          updatedAt: new Date('2023-01-02T00:00:00.000Z'),
          userId: 'user-456',
        },
      ];

      const mockRequest = {
        headers: { 'x-user-id': userId },
        query: {},
        body: {},
        method: 'GET',
        url: '/api/v1/user-records',
      };

      queryBus.execute.mockResolvedValue(mixedStatusVideos);

      // When
      const result = await controller.getUserRecords(
        userId,
        mockRequest as any,
      );

      // Then
      expect(result).toHaveLength(2);
      expect(result).toEqual(mixedStatusVideos);
      expect(result.map((v) => v.status)).toEqual([
        VideoStatus.PENDING,
        VideoStatus.COMPLETED,
      ]);
    });
  });
});
