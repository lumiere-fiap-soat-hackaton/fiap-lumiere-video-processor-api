export interface AppConfig {
  aws: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  };
  app: {
    env: string;
    port: number;
    logLevel: string;
  };
  dynamoDb: {
    endpoint: string;
    region: string;
  };
  sqs: {
    endpoint?: string;
    mediaEventsQueue: string;
    mediaProcessQueue: string;
    mediaResultQueue: string;
  };
  s3: {
    bucketName: string;
  };
}

export const configuration = (): AppConfig => ({
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  },
  app: {
    env: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT) || 3000,
    logLevel: process.env.LOG_LEVEL || 'debug',
  },
  dynamoDb: {
    endpoint: process.env.DYNAMODB_ENDPOINT,
    region: process.env.DYNAMODB_REGION,
  },
  sqs: {
    endpoint: process.env.SQS_ENDPOINT,
    mediaEventsQueue: process.env.MEDIA_EVENTS_QUEUE,
    mediaProcessQueue: process.env.MEDIA_PROCESS_QUEUE,
    mediaResultQueue: process.env.MEDIA_RESULT_QUEUE,
  },
  s3: {
    bucketName: process.env.AWS_S3_BUCKET_NAME,
  },
});

export const pinoConfig = () => {
  const config = configuration();
  const pinoOptions = {
    level: config.app.logLevel,
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        singleLine: true,
        ignore: 'pid,hostname',
      },
    },
    singleLine: true,
    redact: ['req.headers.authorization'],
    formatters: {
      level: (label: string) => {
        return { level: label };
      },
    },
  };

  return pinoOptions;
};
