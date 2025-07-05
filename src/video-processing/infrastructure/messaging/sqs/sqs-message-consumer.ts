import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  ReceiveMessageCommandOutput,
} from '@aws-sdk/client-sqs';
import {
  MessageConsumer,
  MessageHandler,
  Message,
} from '@app/video-processing/domain/messaging/message-consumer.interface';
import { SQS_CLIENT } from './sqs.module';

@Injectable()
export class SqsMessageConsumer implements MessageConsumer {
  private isRunning = false;

  constructor(
    @Inject(SQS_CLIENT)
    private readonly sqsClient: SQSClient,
    private readonly configService: ConfigService,
  ) {}

  async startConsuming<T>(
    queueName: string,
    handler: MessageHandler<T>,
  ): Promise<void> {
    if (this.isRunning) {
      throw new Error('Consumer is already running');
    }

    this.isRunning = true;
    const baseUrl = this.configService.get<string>('SQS_ENDPOINT');
    const fullQueueName = this.configService.get<string>(queueName);
    const queueUrl = `${baseUrl}/queue/${fullQueueName}`;

    console.log(`🚀 Starting to consume messages from: ${queueUrl}`);

    // Loop infinito para polling
    while (this.isRunning) {
      try {
        await this.pollMessages(queueUrl, handler);
      } catch (error) {
        console.error('Error polling messages:', error);
        await this.sleep(5000); // Aguardar antes de tentar novamente
      }
    }
  }

  stopConsuming(): void {
    console.log('🛑 Stopping message consumer...');
    this.isRunning = false;
  }

  private async pollMessages<T>(
    queueUrl: string,
    handler: MessageHandler<T>,
  ): Promise<void> {
    const command = new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 20, // Long polling
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
    sqsMessage: any,
    handler: MessageHandler<T>,
  ): Promise<void> {
    try {
      const message: Message<T> = {
        id: sqsMessage.MessageId,
        body: JSON.parse(sqsMessage.Body),
        receiptHandle: sqsMessage.ReceiptHandle,
      };

      await handler.handle(message);
      await this.deleteMessage(queueUrl, sqsMessage.ReceiptHandle);

      console.log(`✅ Message processed successfully: ${message.id}`);
    } catch (error) {
      console.error(
        `❌ Failed to process message ${sqsMessage.MessageId}:`,
        error,
      );
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
