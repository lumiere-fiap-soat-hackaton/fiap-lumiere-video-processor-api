import {
  SQSMessageS3Details,
  SQSMessageS3EventRecord,
  SQSMessageBody,
} from '@app/video-processing/domain/messaging/messages/sqs-message.interface';
import { Injectable, Logger } from '@nestjs/common';
import {
  Message,
  MessageHandler,
} from '../../domain/messaging/message-consumer.interface';
import { ProcessMediaFileHandler } from '../commands/video.handlers';

@Injectable()
export class MediaEventApplicationHandler
  implements MessageHandler<SQSMessageBody>
{
  private readonly logger = new Logger(MediaEventApplicationHandler.name);

  constructor(
    private readonly processMediaFileHandler: ProcessMediaFileHandler,
  ) {}

  async handle(message: Message<SQSMessageBody>): Promise<void> {
    console.log(`-- Processing SQS records: ${JSON.stringify(message)}`);

    // Extrair o body real que contém os Records
    let actualBody: SQSMessageBody;

    try {
      // Se message.body tem um campo Body (JSON aninhado), parse novamente
      if (
        message.body &&
        typeof message.body === 'object' &&
        'Body' in message.body
      ) {
        const messageBodyWithNesting = message.body as unknown as {
          Body: string;
          [key: string]: unknown;
        };
        const nestedBody = messageBodyWithNesting.Body;
        if (typeof nestedBody === 'string') {
          actualBody = JSON.parse(nestedBody) as SQSMessageBody;
        } else {
          actualBody = nestedBody as SQSMessageBody;
        }
      } else {
        // Se já tem Records diretamente
        actualBody = message.body;
      }
    } catch (parseError) {
      this.logger.error('Failed to parse nested message body:', parseError);
      this.logger.error('Original message body:', message.body);
      return;
    }

    // Verificar se actualBody.Records existe
    if (
      !actualBody ||
      !actualBody.Records ||
      !Array.isArray(actualBody.Records)
    ) {
      this.logger.error(
        'Invalid message format: missing Records array',
        actualBody,
      );
      return;
    }

    console.log(`-- Found ${actualBody.Records.length} records to process`);

    // Processar cada SQS record individualmente
    for (const sqsRecord of actualBody.Records) {
      console.log(`Processing Record: ${JSON.stringify(sqsRecord)}`);
      try {
        await this.processSQSRecord(sqsRecord);
      } catch (error) {
        this.logger.error(`Failed to process SQS record:`, error);
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
      this.logger.error(`Failed to parse SQS body for message:`, parseError);
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
