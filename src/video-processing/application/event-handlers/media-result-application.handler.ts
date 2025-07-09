import { Injectable, Logger } from '@nestjs/common';
import {
  MessageHandler,
  Message,
} from '../../domain/messaging/message-consumer.interface';
import {
  MediaResultMessage,
  MediaResultMessageStatus,
} from '../../domain/messaging/messages/media-result-message';
import { VideoStatus } from '../../domain/entities/video.entity';
import { UpdateVideoStatusHandler } from '../commands/video.handlers';

@Injectable()
export class MediaResultApplicationHandler
  implements MessageHandler<MediaResultMessage>
{
  private readonly logger = new Logger(MediaResultApplicationHandler.name);

  constructor(
    private readonly updateVideoStatusHandler: UpdateVideoStatusHandler,
  ) {}

  async handle(message: Message<MediaResultMessage>): Promise<void> {
    const { id, status: mediaResultStatus, resultFileKey } = message.body;

    this.logger.log(`Processing media result for video ID: ${id}`);

    try {
      // Converter status da mensagem para status do domínio
      const status = this.mapToVideoStatus(mediaResultStatus);
      const resultFileName = resultFileKey
        ? resultFileKey.split('/').pop()
        : undefined;

      // Executar comando de atualização
      await this.updateVideoStatusHandler.handle({
        videoId: id,
        status,
        resultFileKey,
        resultFileName,
      });

      this.logger.log(
        `Successfully processed media result for video ID: ${id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process media result for video ID: ${id}`,
        error,
      );

      // Re-throw para que a mensagem seja reprocessada
      throw error;
    }
  }

  private mapToVideoStatus(
    mediaResultStatus: MediaResultMessageStatus,
  ): VideoStatus {
    return mediaResultStatus === MediaResultMessageStatus.SUCCESS
      ? VideoStatus.COMPLETED
      : VideoStatus.FAILED;
  }
}
