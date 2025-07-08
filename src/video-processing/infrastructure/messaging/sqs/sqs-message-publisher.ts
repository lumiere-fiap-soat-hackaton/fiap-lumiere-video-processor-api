import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { MessagePublisher } from '@app/video-processing/domain/messaging/message-publisher.interface';
import { SQS_CLIENT } from './sqs.module';

@Injectable()
export class SqsMessagePublisher implements MessagePublisher {
  constructor(
    @Inject(SQS_CLIENT)
    private readonly sqsClient: SQSClient,
    private readonly configService: ConfigService,
  ) {}

  async publish<T>(queueName: string, message: T): Promise<string> {
    if (!queueName) {
      throw new Error(
        'Queue name is required and cannot be undefined or empty',
      );
    }

    const baseUrl = this.configService.get<string>('sqs.endpoint');
    if (!baseUrl) {
      throw new Error('SQS endpoint is not configured');
    }

    const queueUrl = `${baseUrl}/${queueName}`;

    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(message),
    });

    try {
      const result = await this.sqsClient.send(command);
      return result.MessageId || '';
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `Failed to publish message to ${queueName}: ${errorMessage}`,
      );
    }
  }
}
