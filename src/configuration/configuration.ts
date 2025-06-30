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
