export enum VideoStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface Video {
  id: string;
  sourceFileKey: string;
  sourceFileName: string;
  resultFileKey?: string;
  resultFileName?: string;
  description?: string;
  status: VideoStatus;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}
