import { VideoStatus } from '../../domain/entities/video.entity';

export interface ProcessMediaFileCommand {
  userId: string;
  sourceFileKey: string;
  sourceFileName: string;
}

export interface UpdateVideoStatusCommand {
  videoId: string;
  status: VideoStatus;
  resultFileKey?: string;
  resultFileName?: string;
}
