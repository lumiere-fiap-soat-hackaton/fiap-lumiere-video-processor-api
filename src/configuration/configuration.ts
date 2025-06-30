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
