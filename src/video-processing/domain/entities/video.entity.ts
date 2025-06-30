export type VideoStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Video {
  id: string;
  title: string;
  description?: string;
  url: string;
  status: VideoStatus;
  createdAt: Date;
  updatedAt: Date;
}
