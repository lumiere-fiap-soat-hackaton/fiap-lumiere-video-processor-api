import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  ReceiveMessageCommandOutput,
  Message as SQSMessage,
} from '@aws-sdk/client-sqs';
import {
  MessageConsumer,
  MessageHandler,
  Message,
} from '@app/video-processing/domain/messaging/message-consumer.interface';
import { SQS_CLIENT } from './sqs.module';

@Injectable()
export class SqsMessageConsumer implements MessageConsumer {
  private runningConsumers = new Map<string, boolean>(); // Track multiple consumers

  constructor(
    @Inject(SQS_CLIENT)
    private readonly sqsClient: SQSClient,
    private readonly configService: ConfigService,
  ) {}

  async startConsuming<T>(
    queueName: string,
    handler: MessageHandler<T>,
  ): Promise<void> {
    // Check if THIS specific queue is already being consumed
    if (this.runningConsumers.get(queueName)) {
      throw new Error(`Consumer for queue ${queueName} is already running`);
    }

    this.runningConsumers.set(queueName, true);
    const baseUrl = this.configService.get<string>('sqs.endpoint');
    const queueUrl = `${baseUrl}/${queueName}`;

    console.log(`Starting to consume messages from: ${queueUrl}`);

    // Start consuming for this specific queue
    void this.consumeQueue(queueUrl, queueName, handler);
  }

  stopConsuming(queueName?: string): void {
    if (queueName) {
      console.log(`Stopping consumer for queue: ${queueName}`);
      this.runningConsumers.set(queueName, false);
    } else {
      console.log('Stopping all consumers...');
      this.runningConsumers.forEach((_, key) => {
        this.runningConsumers.set(key, false);
      });
    }
  }

  private async consumeQueue<T>(
    queueUrl: string,
    queueName: string,
    handler: MessageHandler<T>,
  ): Promise<void> {
    // Loop específico para esta fila
    while (this.runningConsumers.get(queueName)) {
      try {
        await this.pollMessages(queueUrl, handler);
      } catch (error) {
        console.error(`Error polling messages from ${queueName}:`, error);
        await this.sleep(5000);
      }
    }
  }

  private async pollMessages<T>(
    queueUrl: string,
    handler: MessageHandler<T>,
  ): Promise<void> {
    const command = new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 20,
      VisibilityTimeout: 30,
    });

    const result: ReceiveMessageCommandOutput =
      await this.sqsClient.send(command);

    if (result.Messages && result.Messages.length > 0) {
      await Promise.all(
        result.Messages.map((sqsMessage) =>
          this.processMessage(queueUrl, sqsMessage, handler),
        ),
      );
    }
  }

  private async processMessage<T>(
    queueUrl: string,
    sqsMessage: SQSMessage,
    handler: MessageHandler<T>,
  ): Promise<void> {
    try {
      console.log(`-- Received SQS message: ${JSON.stringify(sqsMessage)}`);

      if (!sqsMessage.Body) {
        throw new Error('SQS message body is empty');
      }

      // Parse do Body do SQS - pode ser um JSON duplo
      let parsedBody: unknown;
      try {
        const firstParse: unknown = JSON.parse(sqsMessage.Body);
        // Se o resultado for uma string, parse novamente (JSON duplo)
        if (typeof firstParse === 'string') {
          parsedBody = JSON.parse(firstParse);
        } else {
          parsedBody = firstParse;
        }
      } catch (parseError) {
        console.error(`Failed to parse SQS message body:`, parseError);
        console.error(`Original body:`, sqsMessage.Body);
        throw parseError;
      }

      const message: Message<T> = {
        id: sqsMessage.MessageId || '',
        body: parsedBody as T,
        receiptHandle: sqsMessage.ReceiptHandle || '',
      };

      console.log(`-- Processing message: ${JSON.stringify(message)}`);

      await handler.handle(message);
      await this.deleteMessage(queueUrl, sqsMessage.ReceiptHandle || '');
      console.log(`Message processed successfully: ${message.id}`);
    } catch (error) {
      console.error(
        `Failed to process message ${sqsMessage.MessageId || 'unknown'}:`,
        error,
      );
      // Deletar a mensagem mesmo em caso de erro para evitar reprocessamento infinito
      try {
        await this.deleteMessage(queueUrl, sqsMessage.ReceiptHandle || '');
      } catch (deleteError) {
        console.error(
          'Failed to delete message after processing error:',
          deleteError,
        );
      }
    }
  }

  private async deleteMessage(
    queueUrl: string,
    receiptHandle: string,
  ): Promise<void> {
    const command = new DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle,
    });

    await this.sqsClient.send(command);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
