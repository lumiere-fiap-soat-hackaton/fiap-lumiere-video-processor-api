export interface AppConfig {
  app: {
    env: string;
    port: number;
    logLevel: string;
  };
  dynamoDb: {
    endpoint: string;
    region: string;
  };
  aws: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  sqs: {
    endpoint?: string;
    mediaEventsQueue: string;
    mediaProcessQueue: string;
    mediaResultQueue: string;
  };
}

export const configuration = (): AppConfig => ({
  app: {
    env: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT) || 3000,
    logLevel: process.env.LOG_LEVEL || 'debug',
  },
  dynamoDb: {
    endpoint: process.env.DYNAMODB_ENDPOINT,
    region: process.env.DYNAMODB_REGION,
  },
  aws: {
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  sqs: {
    endpoint: process.env.SQS_ENDPOINT,
    mediaEventsQueue: process.env.MEDIA_EVENTS_QUEUE,
    mediaProcessQueue: process.env.MEDIA_PROCESS_QUEUE,
    mediaResultQueue: process.env.MEDIA_RESULT_QUEUE,
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
