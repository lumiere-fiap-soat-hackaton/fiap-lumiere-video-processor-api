import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SQSClient, SQSClientConfig } from '@aws-sdk/client-sqs';

export const SQS_CLIENT = 'SQS_CLIENT';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: SQS_CLIENT,
      useFactory: (configService: ConfigService) => {
        const region = configService.get<string>('aws.region', 'us-east-1');
        const endpoint = configService.get<string>('sqs.endpoint');

        const config: SQSClientConfig = {
          region,
        };

        // Para desenvolvimento local (ElasticMQ)
        if (endpoint) {
          config.endpoint = endpoint;
        }

        // Credenciais fake para desenvolvimento local
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

        return new SQSClient(config);
      },
      inject: [ConfigService],
    },
  ],
  exports: [SQS_CLIENT],
})
export class SqsModule {}
