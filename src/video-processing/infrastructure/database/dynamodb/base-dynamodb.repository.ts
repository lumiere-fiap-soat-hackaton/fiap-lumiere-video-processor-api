import { Inject, Injectable } from '@nestjs/common';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DYNAMODB_DOCUMENT_CLIENT } from './dynamodb.module';

@Injectable()
export abstract class BaseDynamoDbRepository {
  constructor(
    @Inject(DYNAMODB_DOCUMENT_CLIENT)
    protected readonly dynamoDb: DynamoDBDocumentClient,
    protected readonly tableName: string,
  ) {}

  protected async executeCommand<T>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    command: any,
  ): Promise<T> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = await this.dynamoDb.send(command);
      return result as T;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`DynamoDB operation failed: ${message}`);
    }
  }
}
