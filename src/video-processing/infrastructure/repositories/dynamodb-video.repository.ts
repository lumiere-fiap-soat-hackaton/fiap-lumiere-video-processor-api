import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
  DynamoDBDocumentClient,
  QueryCommandOutput,
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
    private readonly configService: ConfigService,
  ) {
    super(dynamoDb, configService.get<string>('dynamoDb.tableName', 'videos'));
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

    console.log(`-- Creating video with ID: ${video.id}`);

    // Converter para formato DynamoDB
    const dynamoItem = this.toDynamoItem(video);

    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: dynamoItem,
      });

      await this.executeCommand<PutCommandOutput>(command);
    } catch (error) {
      console.error(`Error creating video with ID ${video.id}:`, error);
      throw new Error(`Failed to create video: ${error}`);
    }
    return video;
  }

  async findById(id: string): Promise<Video | null> {
    // Ensure id is a string and not undefined/null
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid id provided for findById');
    }

    console.log(`-- Finding video by ID: ${id}`);
    console.log(`-- Table name: ${this.tableName}`);

    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'id = :id',
      ExpressionAttributeValues: {
        ':id': String(id), // Explicitly convert to string to ensure correct type
      },
      Limit: 1, // Ensure we only get one item since we're searching by unique ID
    });

    try {
      const result = await this.executeCommand<QueryCommandOutput>(command);

      console.log(`-- DynamoDB Query Result:`, {
        found: !!(result.Items && result.Items.length > 0),
        itemCount: result.Items?.length || 0,
        itemId: result.Items?.[0]?.id as string,
      });

      return result.Items && result.Items.length > 0
        ? this.fromDynamoItem(result.Items[0] as DynamoVideoItem)
        : null;
    } catch (error) {
      console.error('DynamoDB Query Error:', {
        id,
        tableName: this.tableName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
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

  async findByStatus(status: string): Promise<Video[]> {
    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': status,
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
    // Validação básica
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid id provided for update');
    }

    if (!data || Object.keys(data).length === 0) {
      throw new Error('No data provided for update');
    }

    // Log para debug
    console.log(`-- Updating video with ID: ${id}`);
    console.log(`-- Update data:`, JSON.stringify(data, null, 2));
    console.log(`-- Table name: ${this.tableName}`);

    // Verificar se o item existe antes de tentar atualizar
    const existingVideo = await this.findById(id);
    if (!existingVideo) {
      throw new Error(`Video with id ${id} not found`);
    }

    console.log(`-- Video found in database: ${existingVideo.id}`);

    let updateExpression = 'SET #updatedAt = :updatedAt';
    const expressionAttributeNames: Record<string, string> = {
      '#updatedAt': 'updatedAt',
    };
    const expressionAttributeValues: Record<string, string | number | boolean> =
      {
        ':updatedAt': new Date().toISOString(),
      };

    // Filtrar apenas campos válidos e não-undefined
    const validFields = Object.keys(data).filter(
      (key) =>
        key !== 'id' &&
        key !== 'createdAt' &&
        data[key as keyof Video] !== undefined,
    );

    validFields.forEach((key) => {
      updateExpression += `, #${key} = :${key}`;
      expressionAttributeNames[`#${key}`] = key;

      let value = data[key as keyof Video];

      // Converter Date para string se necessário
      if (value instanceof Date) {
        value = value.toISOString();
      }

      // Garantir que não seja undefined
      if (value !== undefined) {
        expressionAttributeValues[`:${key}`] = value as
          | string
          | number
          | boolean;
      }
    });

    // Se não há campos para atualizar além do updatedAt, apenas atualizar o timestamp
    if (validFields.length === 0) {
      console.log(
        `No valid fields to update for video ${id}, only updating timestamp`,
      );
    }

    // Log da operação DynamoDB
    console.log(`-- DynamoDB Update Expression: ${updateExpression}`);
    console.log(`-- Expression Attribute Names:`, expressionAttributeNames);
    console.log(`-- Expression Attribute Values:`, expressionAttributeValues);

    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { id: String(id) }, // Explicitly convert to string
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW', // Retorna todos os atributos após a atualização
      // Removendo ConditionExpression já que verificamos manualmente
    });

    console.log(`-- DynamoDB Command Key:`, { id: String(id) });
    console.log(`-- DynamoDB Command Table:`, this.tableName);

    try {
      const result = await this.executeCommand<UpdateCommandOutput>(command);

      if (!result.Attributes) {
        throw new Error(`Failed to update video ${id}: No attributes returned`);
      }

      console.log(`-- Video updated successfully: ${id}`);
      return this.fromDynamoItem(result.Attributes as DynamoVideoItem);
    } catch (error) {
      // Se for erro de schema, tentar método alternativo
      if (
        error instanceof Error &&
        error.message.includes('does not match the schema')
      ) {
        console.warn(
          `-- Schema error detected, trying alternative update method for video ${id}`,
        );
        return this.updateAlternative(id, data);
      }

      // Log detalhado do erro para debug
      console.error('DynamoDB Update Error:', {
        id,
        tableName: this.tableName,
        updateExpression,
        expressionAttributeNames,
        expressionAttributeValues,
        keyProvided: { id },
        error: error instanceof Error ? error.message : 'Unknown error',
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorCode: 'Unknown',
      });

      throw error;
    }
  }

  async updateAlternative(id: string, data: Partial<Video>): Promise<Video> {
    // Método alternativo usando PUT ao invés de UPDATE
    // Usado como fallback se o método update não funcionar

    console.log(`-- Using alternative update method for video ID: ${id}`);

    // Buscar o vídeo existente
    const existingVideo = await this.findById(id);
    if (!existingVideo) {
      throw new Error(`Video with id ${id} not found`);
    }

    // Merge dos dados existentes com os novos dados
    const updatedVideo: Video = {
      ...existingVideo,
      ...data,
      id: existingVideo.id, // Garantir que o ID não seja sobrescrito
      createdAt: existingVideo.createdAt, // Garantir que createdAt não seja sobrescrito
      updatedAt: new Date(), // Sempre atualizar o timestamp
    };

    // Converter para formato DynamoDB
    const dynamoItem = this.toDynamoItem(updatedVideo);

    const command = new PutCommand({
      TableName: this.tableName,
      Item: dynamoItem,
    });

    try {
      await this.executeCommand<PutCommandOutput>(command);
      console.log(
        `-- Video updated successfully using alternative method: ${id}`,
      );
      return updatedVideo;
    } catch (error) {
      console.error('DynamoDB Alternative Update Error:', {
        id,
        tableName: this.tableName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid id provided for delete');
    }

    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: { id: String(id) }, // Explicitly convert to string
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
