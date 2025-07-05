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
import {
  MediaEventMessage,
  S3EventRecord,
} from '../messaging/messages/media-event-message';
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
    // Processar cada record individualmente
    for (const record of message.body.Records) {
      try {
        await this.processRecord(record);
      } catch (error) {
        console.error(
          `Failed to process record for ${record.s3.object.key}:`,
          error,
        );
        // Continuar processando outros records mesmo se um falhar
      }
    }
  }

  private async processRecord(record: S3EventRecord): Promise<void> {
    const { bucket, object: s3Object } = record.s3;
    const bucketName = bucket.name;
    const objectKey = s3Object.key;
    const objectSize = s3Object.size;

    console.log(
      `📄 Processing: ${record.eventName} for ${bucketName}/${objectKey}`,
    );

    // Extrair nome do arquivo
    const fileName = objectKey.split('/').pop() || objectKey;

    // 1. Criar registro do vídeo no banco
    const video = await this.videoRepository.create({
      sourceFileKey: objectKey,
      sourceFileName: fileName,
    });

    console.log(`✅ Video created with ID: ${video.id}`);

    // 2. Enviar para fila de processamento
    // const processMessage: MediaProcessMessage = {
    //   videoId: video.id,
    //   action: 'process',
    //   inputUrl: `s3://${bucketName}/${objectKey}`,
    //   outputBucket: bucketName,
    //   metadata: {
    //     originalSize: objectSize,
    //     etag: s3Object.eTag,
    //     eventTime: record.eventTime,
    //   },
    //   timestamp: new Date().toISOString(),
    //   correlationId: `${video.id}-${Date.now()}`,
    // };

    // const processQueueKey = this.configService.get<string>(
    //   'MEDIA_PROCESS_QUEUE',
    // );
    // await this.messagePublisher.publish(processQueueKey, processMessage);
  }
}
