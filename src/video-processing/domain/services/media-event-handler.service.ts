import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MessageHandler,
  Message,
} from '../messaging/message-consumer.interface';
import {
  MessagePublisher,
  MESSAGE_PUBLISHER,
} from '../messaging/message-publisher.interface';
import { MediaEventMessage } from '../messaging/messages/media-event-message';
import { MediaProcessMessage } from '../messaging/messages/media-process-message';
import {
  VideoRepository,
  VIDEO_REPOSITORY,
} from '../repositories/video.repository';
import { VideoStatus } from '../entities/video.entity';

@Injectable()
export class MediaEventHandler implements MessageHandler<MediaEventMessage> {
  constructor(
    @Inject(MESSAGE_PUBLISHER)
    private readonly messagePublisher: MessagePublisher,
    @Inject(VIDEO_REPOSITORY)
    private readonly videoRepository: VideoRepository,
    private readonly configService: ConfigService,
  ) {}

  async handle(message: Message<MediaEventMessage>): Promise<void> {
    const { bucketName, objectKey, objectSize } = message.body;

    // 1. Criar registro do vídeo no banco
    const video = await this.videoRepository.create({
      title: objectKey,
      description: `Uploaded from S3: ${bucketName}/${objectKey}`,
      url: `s3://${bucketName}/${objectKey}`,
      status: VideoStatus.PENDING,
    });

    // 2. Enviar para fila de processamento
    const processMessage: MediaProcessMessage = {
      videoId: video.id,
      action: 'process',
      inputUrl: `s3://${bucketName}/${objectKey}`,
      outputBucket: bucketName,
      metadata: {
        originalSize: objectSize,
        etag: message.body.etag,
      },
      timestamp: new Date().toISOString(),
      correlationId: `${video.id}-${Date.now()}`,
    };

    const processQueueKey = this.configService.get<string>(
      'sqs.mediaProcessQueue',
    );
    await this.messagePublisher.publish(processQueueKey, processMessage);
  }
}
