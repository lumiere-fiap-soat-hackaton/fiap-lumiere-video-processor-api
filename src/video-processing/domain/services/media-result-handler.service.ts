import { Injectable, Inject } from '@nestjs/common';
import {
  MessageHandler,
  Message,
} from '../messaging/message-consumer.interface';
import { MediaResultMessage } from '../messaging/messages/media-result-message';
import {
  VideoRepository,
  VIDEO_REPOSITORY,
} from '../repositories/video.repository';
import { VideoStatus } from '../entities/video.entity';

@Injectable()
export class MediaResultHandler implements MessageHandler<MediaResultMessage> {
  constructor(
    @Inject(VIDEO_REPOSITORY)
    private readonly videoRepository: VideoRepository,
  ) {}

  async handle(message: Message<MediaResultMessage>): Promise<void> {
    const { videoId, status, result, error } = message.body;

    // Atualizar status e URL do vídeo baseado no resultado
    const updateData = {
      status: status === 'success' ? VideoStatus.COMPLETED : VideoStatus.FAILED,
      ...(result?.processedUrl && { url: result.processedUrl }), // Atualizar URL com versão processada
      ...(result?.description && { description: result.description }),
      updatedAt: new Date(),
    };

    await this.videoRepository.update(videoId, updateData);
  }
}
