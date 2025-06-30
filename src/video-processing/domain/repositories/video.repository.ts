import { Video } from '../entities/video.entity';

export const VIDEO_REPOSITORY = 'VIDEO_REPOSITORY';

export interface VideoRepository {
  create(video: Omit<Video, 'id' | 'createdAt' | 'updatedAt'>): Promise<Video>;
  findById(id: string): Promise<Video | null>;
  findAll(): Promise<Video[]>;
  update(id: string, data: Partial<Video>): Promise<Video>;
  delete(id: string): Promise<void>;
}
