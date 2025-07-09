import { Injectable, Logger } from '@nestjs/common';
import {
  MessageHandler,
  Message,
} from '../../domain/messaging/message-consumer.interface';
import {
  MediaEventMessage,
  S3EventRecord,
  SQSRecord,
  S3EventMessage,
} from '../../domain/messaging/messages/media-event-message';
import { ProcessMediaFileHandler } from '../commands/video.handlers';

@Injectable()
export class MediaEventApplicationHandler
  implements MessageHandler<MediaEventMessage>
{
  private readonly logger = new Logger(MediaEventApplicationHandler.name);

  constructor(
    private readonly processMediaFileHandler: ProcessMediaFileHandler,
  ) {}

  async handle(message: Message<MediaEventMessage>): Promise<void> {
    console.log(`Processing SQS records: ${JSON.stringify(message)}`);

    // Processar cada SQS record individualmente
    for (const sqsRecord of message.body.Records) {
      try {
        await this.processSQSRecord(sqsRecord);
      } catch (error) {
        this.logger.error(
          `Failed to process SQS record ${sqsRecord.messageId}:`,
          error,
        );
        // Continuar processando outros records mesmo se um falhar
      }
    }
  }

  private async processSQSRecord(sqsRecord: SQSRecord): Promise<void> {
    try {
      // Parse do body do SQS que contém o S3 event
      const s3Event = JSON.parse(sqsRecord.body) as S3EventMessage;

      // Processar cada S3 record dentro do SQS message
      for (const s3Record of s3Event.Records) {
        await this.processS3Record(s3Record);
      }
    } catch (parseError) {
      this.logger.error(
        `Failed to parse SQS body for message ${sqsRecord.messageId}:`,
        parseError,
      );
      throw parseError;
    }
  }

  private async processS3Record(record: S3EventRecord): Promise<void> {
    const { object: s3Object } = record.s3;
    const objectKey = s3Object.key;

    // Extrair informações do arquivo
    const { fileName, uuid: userId } = this.extractFileInfo(objectKey);

    if (!userId) {
      this.logger.warn(`Could not extract user ID from file: ${objectKey}`);
      return;
    }

    // Executar comando de processamento
    await this.processMediaFileHandler.handle({
      userId,
      sourceFileKey: objectKey,
      sourceFileName: fileName,
    });

    this.logger.log(`Successfully processed media event for file: ${fileName}`);
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
    this.logger.warn(`Could not extract UUID from: ${fileName}`);
    return {
      fileName,
      uuid: '',
      originalFileName: fileName,
    };
  }
}
