export enum VideoStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface Video {
  id: string;
  title: string;
  description?: string;
  url: string;
  status: VideoStatus;
  createdAt: Date;
  updatedAt: Date;
}
