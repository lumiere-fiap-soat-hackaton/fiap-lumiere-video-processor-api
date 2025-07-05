export interface MessagePublisher {
  publish<T>(queueName: string, message: T): Promise<string>;
}

export const MESSAGE_PUBLISHER = 'MESSAGE_PUBLISHER';
