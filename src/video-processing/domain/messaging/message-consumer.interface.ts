import { SQSMessageBody } from './messages/sqs-message.interface';

export interface Message<T = SQSMessageBody> {
  id: string;
  body: T;
  receiptHandle: string;
}

export interface MessageHandler<T = SQSMessageBody> {
  handle(message: Message<T>): Promise<void>;
}

export interface MessageConsumer {
  startConsuming<T>(
    queueName: string,
    handler: MessageHandler<T>,
  ): Promise<void>;
  stopConsuming(): void; // Remover Promise
}

export const MESSAGE_CONSUMER = 'MESSAGE_CONSUMER';
