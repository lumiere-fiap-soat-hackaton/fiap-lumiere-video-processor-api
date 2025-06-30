import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import {
  DynamoDBClient,
  CreateTableCommand,
  ListTablesCommand,
} from '@aws-sdk/client-dynamodb';
import { AppModule } from '../app.module';

class DatabaseSetupService {
  private client: DynamoDBClient;
  private configService: ConfigService;

  constructor(configService: ConfigService) {
    this.configService = configService;
    this.setupDynamoClient();
  }

  private setupDynamoClient(): void {
    const region = this.configService.get<string>('aws.region');
    const endpoint = this.configService.get<string>('dynamoDb.endpoint');

    this.client = new DynamoDBClient({
      region,
      endpoint,
    });
  }

  async tableExists(tableName: string): Promise<boolean> {
    try {
      const command = new ListTablesCommand({});
      const result = await this.client.send(command);
      return result.TableNames?.includes(tableName) || false;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error checking if table exists:', message);
      return false;
    }
  }

  async createVideosTable(): Promise<void> {
    const tableName = this.configService.get<string>('VIDEOS_TABLE', 'videos');

    if (await this.tableExists(tableName)) {
      console.log(`✅ Table '${tableName}' already exists`);
      return;
    }

    const command = new CreateTableCommand({
      TableName: tableName,
      KeySchema: [
        {
          AttributeName: 'id',
          KeyType: 'HASH',
        },
      ],
      AttributeDefinitions: [
        {
          AttributeName: 'id',
          AttributeType: 'S',
        },
      ],
      BillingMode: 'PAY_PER_REQUEST',
    });

    try {
      await this.client.send(command);
      console.log(`✅ Table '${tableName}' created successfully`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Error creating table '${tableName}':`, message);
      throw error;
    }
  }

  async checkDynamoDBConnection(): Promise<void> {
    const maxRetries = 5;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        await this.client.send(new ListTablesCommand({}));
        console.log('✅ Connected to DynamoDB');
        return;
      } catch (error) {
        retries++;
        const message =
          error instanceof Error ? error.message : 'Unknown error';

        if (retries === maxRetries) {
          console.error(
            `❌ Failed to connect after ${maxRetries} attempts:`,
            message,
          );
          const endpoint = this.configService.get<string>('dynamoDb.endpoint');
          if (endpoint) {
            console.error(
              `❌ Could not connect to DynamoDB Local at ${endpoint}`,
            );
            console.log('💡 Run: npm run docker:up');
          } else {
            console.error('❌ Could not connect to AWS DynamoDB');
          }
          process.exit(1);
        } else {
          console.log(
            `⏳ Attempt ${retries}/${maxRetries} failed, retrying in 2 seconds...`,
          );
          await new Promise<void>((resolve) => {
            setTimeout(() => resolve(), 2000);
          });
        }
      }
    }
  }

  async setupDatabase(): Promise<void> {
    console.log('🚀 Setting up database...');

    try {
      await this.createVideosTable();
      console.log('✅ Database setup completed!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to setup database:', message);
      process.exit(1);
    }
  }
}

async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  const configService = app.get(ConfigService);

  const env = configService.get<string>('app.env');
  const isDevelopment = env === 'development' || !env;

  console.log('🔧 Environment:', env);

  if (!isDevelopment) {
    console.log('⚠️  This script should only run in development environment');
    await app.close();
    process.exit(1);
  }

  const dbSetup = new DatabaseSetupService(configService);

  await dbSetup.checkDynamoDBConnection();
  await dbSetup.setupDatabase();

  await app.close();
}

void main().catch(async (error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error('❌ Script failed:', message);
  process.exit(1);
});
