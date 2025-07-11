import { ApiProperty } from '@nestjs/swagger';

export class VideoResponseDto {
  @ApiProperty({
    description: 'Video unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'User who owns the video',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiProperty({
    description: 'Original filename',
    example: 'my-video.mp4',
  })
  filename: string;

  @ApiProperty({
    description: 'Video processing status',
    enum: ['pending', 'completed', 'failed'],
    example: 'completed',
  })
  status: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-07-07T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-07-07T11:30:00Z',
  })
  updatedAt: Date;
}
