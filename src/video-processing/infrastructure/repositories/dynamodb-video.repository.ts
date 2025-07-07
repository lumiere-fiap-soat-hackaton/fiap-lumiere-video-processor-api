import { Inject, Injectable } from '@nestjs/common';
import {
  PutCommand,
  GetCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommandOutput,
  ScanCommandOutput,
  UpdateCommandOutput,
  PutCommandOutput,
  DeleteCommandOutput,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { BaseDynamoDbRepository } from '../database/dynamodb/base-dynamodb.repository';
import { DYNAMODB_DOCUMENT_CLIENT } from '../database/dynamodb/dynamodb.module';
import {
  Video,
  VideoStatus,
} from '@app/video-processing/domain/entities/video.entity';
import { VideoRepository } from '@app/video-processing/domain/repositories/video.repository';

// Tipo para representar como o Video é armazenado no DynamoDB
interface DynamoVideoItem {
  id: string;
  sourceFileKey: string;
  sourceFileName: string;
  resultFileKey?: string;
  resultFileName?: string;
  description: string;
  status: string;
  createdAt: string; // ISO string no DynamoDB
  updatedAt: string; // ISO string no DynamoDB
  userId: string;
}

@Injectable()
export class DynamoDbVideoRepository
  extends BaseDynamoDbRepository
  implements VideoRepository
{
  constructor(
    @Inject(DYNAMODB_DOCUMENT_CLIENT)
    dynamoDb: DynamoDBDocumentClient,
  ) {
    super(dynamoDb, 'videos');
  }

  async onModuleInit() {
    // const found = await this.findAll();
    // console.log(found);
    // const created = await this.create({
    //   title: 'Sample Video',
    //   description: 'This is a sample video description.',
    //   url: 'https://example.com/sample-video.mp4',
    //   status: 'pending',
    // });
    // console.log(`Sample video created with ID: ${created.id}`);
  }

  async create(
    videoData: Omit<Video, 'id' | 'createdAt' | 'updatedAt' | 'status'>,
  ): Promise<Video> {
    const now = new Date();
    const video: Video = {
      ...videoData,
      id: uuidv4(),
      status: VideoStatus.PENDING,
      createdAt: now,
      updatedAt: now,
    };

    // Converter para formato DynamoDB
    const dynamoItem = this.toDynamoItem(video);

    const command = new PutCommand({
      TableName: this.tableName,
      Item: dynamoItem,
    });

    await this.executeCommand<PutCommandOutput>(command);
    return video;
  }

  async findById(id: string): Promise<Video | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: { id },
    });

    const result = await this.executeCommand<GetCommandOutput>(command);
    return result.Item
      ? this.fromDynamoItem(result.Item as DynamoVideoItem)
      : null;
  }

  async findByUserId(userId: string): Promise<Video[]> {
    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: '#userId = :userId',
      ExpressionAttributeNames: {
        '#userId': 'userId',
      },
      ExpressionAttributeValues: {
        ':userId': userId,
      },
    });

    const result = await this.executeCommand<ScanCommandOutput>(command);
    const items = result.Items || [];
    return items.map((item) => this.fromDynamoItem(item as DynamoVideoItem));
  }

  async findAll(): Promise<Video[]> {
    const command = new ScanCommand({
      TableName: this.tableName,
    });

    const result = await this.executeCommand<ScanCommandOutput>(command);
    const items = result.Items || [];
    return items.map((item) => this.fromDynamoItem(item as DynamoVideoItem));
  }

  async update(id: string, data: Partial<Video>): Promise<Video> {
    let updateExpression = 'SET #updatedAt = :updatedAt';
    const expressionAttributeNames: Record<string, string> = {
      '#updatedAt': 'updatedAt',
    };
    const expressionAttributeValues: Record<string, string | number | boolean> =
      {
        ':updatedAt': new Date().toISOString(),
      };

    Object.keys(data).forEach((key) => {
      if (key !== 'id' && key !== 'createdAt') {
        updateExpression += `, #${key} = :${key}`;
        expressionAttributeNames[`#${key}`] = key;

        let value = data[key as keyof Video];
        // Converter Date para string se necessário
        if (value instanceof Date) {
          value = value.toISOString();
        }
        expressionAttributeValues[`:${key}`] = value as
          | string
          | number
          | boolean;
      }
    });

    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { id },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW', // Retorna todos os atributos após a atualização
      ConditionExpression: 'attribute_exists(id)', // Garante que o item existe
    });

    try {
      const result = await this.executeCommand<UpdateCommandOutput>(command);
      return this.fromDynamoItem(result.Attributes as DynamoVideoItem);
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        throw new Error(`Video with id ${id} not found`);
      }
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: { id },
    });

    await this.executeCommand<DeleteCommandOutput>(command);
  }

  // Métodos auxiliares para conversão com tipagem correta
  private toDynamoItem(video: Video): DynamoVideoItem {
    return {
      id: video.id,
      sourceFileKey: video.sourceFileKey,
      sourceFileName: video.sourceFileName,
      resultFileKey: video.resultFileKey,
      resultFileName: video.resultFileName,
      description: video.description,
      status: video.status,
      createdAt: video.createdAt.toISOString(),
      updatedAt: video.updatedAt.toISOString(),
      userId: video.userId,
    };
  }

  private fromDynamoItem(item: DynamoVideoItem): Video {
    return {
      id: item.id,
      sourceFileKey: item.sourceFileKey,
      sourceFileName: item.sourceFileName,
      resultFileKey: item.resultFileKey,
      resultFileName: item.resultFileName,
      description: item.description,
      status: item.status as Video['status'],
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
      userId: item.userId,
    };
  }
}
