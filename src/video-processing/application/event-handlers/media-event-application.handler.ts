import {
  SQSMessageS3Details,
  SQSMessageS3EventRecord,
} from '@app/video-processing/domain/messaging/messages/sqs-message.interface';
import { Injectable, Logger } from '@nestjs/common';
import {
  Message,
  MessageHandler,
} from '../../domain/messaging/message-consumer.interface';
import { ProcessMediaFileHandler } from '../commands/video.handlers';

@Injectable()
export class MediaEventApplicationHandler implements MessageHandler {
  private readonly logger = new Logger(MediaEventApplicationHandler.name);

  constructor(
    private readonly processMediaFileHandler: ProcessMediaFileHandler,
  ) {}

  async handle(message: Message): Promise<void> {
    console.log(`-- Processing SQS records: ${JSON.stringify(message)}`);

    // Processar cada SQS record individualmente
    for (const sqsRecord of message.body.Records) {
      console.log(`Processing Record: ${JSON.stringify(sqsRecord)}`);
      try {
        await this.processSQSRecord(sqsRecord);
      } catch (error) {
        this.logger.error(
          `Failed to process SQS record ${JSON.stringify(sqsRecord)}:`,
          error,
        );
        // Continuar processando outros records mesmo se um falhar
      }
    }
  }

  private async processSQSRecord(
    sqsRecord: SQSMessageS3EventRecord,
  ): Promise<void> {
    try {
      // Parse do body do SQS que contém o S3 event
      const s3Event = sqsRecord.s3;
      console.log(`Processing S3 event: ${JSON.stringify(s3Event)}`);
      await this.processS3Record(s3Event);
    } catch (parseError) {
      this.logger.error(
        `Failed to parse SQS body for message ${JSON.stringify(sqsRecord)}:`,
        parseError,
      );
      throw parseError;
    }
  }

  private async processS3Record(record: SQSMessageS3Details): Promise<void> {
    const objectKey = record.object.key;
    console.log(`-- Processing S3 object: ${objectKey}`);

    // Extrair informações do arquivo
    const { fileName, uuid: userId } = this.extractFileInfo(objectKey);

    if (!userId) {
      this.logger.warn(`Could not extract user ID from file: ${objectKey}`);
      return;
    }

    console.log(`-- Processing file: ${fileName} for user: ${userId}`);

    // Executar comando de processamento
    await this.processMediaFileHandler.handle({
      userId,
      sourceFileKey: objectKey,
      sourceFileName: fileName,
    });

    this.logger.log(`Successfully processed media event for file: ${fileName}`);
  }

  // videos/56d92b5e-b539-49ff-8ddb-33c3ffed5e2e--loucura.mp4

  private extractFileInfo(objectKey: string): {
    fileName: string;
    uuid: string;
    originalFileName: string;
  } {
    // Extrair o nome do arquivo (remover prefixos como sources/, videos/, etc.)
    const fileName = objectKey.includes('/')
      ? objectKey.split('/').pop() || objectKey
      : objectKey;

    // Extrair UUID e nome original do formato esperado pela aplicação: {UUID}--{originalFileName}
    const fileNamePattern = /^(.+)--(.+)$/;
    const match = fileName.match(fileNamePattern);

    if (!match) {
      this.logger.warn(
        `Could not extract user ID from videos path: ${fileName}`,
      );
      return {
        fileName: objectKey,
        uuid: '',
        originalFileName: objectKey,
      };
    }

    const uuidPart = match[1];
    const originalFileName = match[2];

    // Extrair apenas o UUID da parte inicial (remover prefixo se houver)
    const uuidMatch = uuidPart.match(
      /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i,
    );
    const uuid = uuidMatch ? uuidMatch[1] : '';

    if (!uuid) {
      this.logger.warn(
        `Could not extract user ID from videos path: ${fileName}`,
      );
    }

    return {
      fileName,
      uuid,
      originalFileName,
    };
  }
}
