import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DynamoDBClient, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export const DYNAMODB_CLIENT = 'DYNAMODB_CLIENT';
export const DYNAMODB_DOCUMENT_CLIENT = 'DYNAMODB_DOCUMENT_CLIENT';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DYNAMODB_CLIENT,
      useFactory: (configService: ConfigService) => {
        const region = configService.get<string>('aws.region', 'us-east-1');
        const endpoint = configService.get<string>('dynamoDb.endpoint');
        const env = configService.get<string>('app.env');

        console.log('🔧 DynamoDB Configuration:', {
          region,
          endpoint: endpoint || 'AWS Default',
          environment: env,
        });

        const config: DynamoDBClientConfig = {
          region,
        };

        // Configuração para desenvolvimento/teste (DynamoDB Local)
        if (endpoint) {
          config.endpoint = endpoint;
        } else {
          // Produção: usar IAM roles ou credenciais do ambiente
          const accessKeyId = configService.get<string>('aws.accessKeyId');
          const secretAccessKey = configService.get<string>(
            'aws.secretAccessKey',
          );

          if (accessKeyId && secretAccessKey) {
            config.credentials = {
              accessKeyId,
              secretAccessKey,
            };
          }
          // Se não tiver credenciais explícitas, usa IAM role/instance profile
        }

        return new DynamoDBClient(config);
      },
      inject: [ConfigService],
    },
    {
      provide: DYNAMODB_DOCUMENT_CLIENT,
      useFactory: (client: DynamoDBClient) => {
        return DynamoDBDocumentClient.from(client, {
          marshallOptions: {
            removeUndefinedValues: true,
            convertEmptyValues: false,
          },
          unmarshallOptions: {
            wrapNumbers: false,
          },
        });
      },
      inject: [DYNAMODB_CLIENT],
    },
  ],
  exports: [DYNAMODB_CLIENT, DYNAMODB_DOCUMENT_CLIENT],
})
export class DynamoDbModule {}
