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
import {
  VideoRepository,
  VIDEO_REPOSITORY,
} from '../repositories/video.repository';

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
    const { object: s3Object } = record.s3;
    const objectKey = s3Object.key;

    // Extrair nome do arquivo
    const { fileName, uuid: userId } = this.extractFileInfo(objectKey);

    // 1. Criar registro do vídeo no banco
    const video = await this.videoRepository.create({
      userId,
      sourceFileKey: objectKey,
      sourceFileName: fileName,
    });

    // 2. Enviar para fila de processamento
    const processQueueKey = this.configService.get<string>(
      'sqs.mediaProcessQueue',
    );
    await this.messagePublisher.publish(processQueueKey, video);
  }

  private extractFileInfo(objectKey: string): {
    fileName: string;
    uuid: string;
    originalFileName: string;
  } {
    // Extrair apenas o nome do arquivo (remover "sources/")
    const fileName = objectKey.split('/').pop() || objectKey;

    // Padrão UUID: 8-4-4-4-12 caracteres hexadecimais
    const uuidRegex =
      /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-(.+)$/i;
    const match = fileName.match(uuidRegex);

    if (match) {
      return {
        fileName,
        uuid: match[1],
        originalFileName: match[2],
      };
    }

    // Fallback se não conseguir extrair UUID
    console.warn(`Could not extract UUID from: ${fileName}`);
    return {
      fileName,
      uuid: '',
      originalFileName: fileName,
    };
  }
}
