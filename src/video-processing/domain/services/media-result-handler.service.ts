import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  MessageHandler,
  Message,
} from '../messaging/message-consumer.interface';
import {
  MediaResultMessage,
  MediaResultMessageStatus,
} from '../messaging/messages/media-result-message';
import {
  VideoRepository,
  VIDEO_REPOSITORY,
} from '../repositories/video.repository';
import { VideoStatus } from '../entities/video.entity';

@Injectable()
export class MediaResultHandler implements MessageHandler<MediaResultMessage> {
  private readonly logger = new Logger(MediaResultHandler.name);

  constructor(
    @Inject(VIDEO_REPOSITORY)
    private readonly videoRepository: VideoRepository,
  ) {}

  async handle(message: Message<MediaResultMessage>): Promise<void> {
    const {
      request_id,
      status: mediaResultMessagestatus,
      result_s3_path,
    } = message.body;

    try {
      const foundVideo = await this.videoRepository.findById(request_id);

      // Se o vídeo não foi encontrado, confirma a mensagem para não reprocessar
      if (!foundVideo) {
        this.logger.warn(
          `Video with request_id ${request_id} not found. Message will be acknowledged.`,
        );
        return; // Mensagem será confirmada automaticamente
      }

      const status =
        mediaResultMessagestatus === MediaResultMessageStatus.SUCCESS
          ? VideoStatus.COMPLETED
          : VideoStatus.FAILED;

      const resultFileKey = result_s3_path;
      const resultFileName = result_s3_path.split('/').pop();

      const updateData = {
        status,
        resultFileKey,
        resultFileName,
      };

      await this.videoRepository.update(request_id, updateData);

      this.logger.log(
        `Successfully processed media result for request_id: ${request_id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process media result for request_id: ${request_id}`,
        error,
      );

      // Rejeita a mensagem para que seja reprocessada
      throw error;
    }
  }
}
