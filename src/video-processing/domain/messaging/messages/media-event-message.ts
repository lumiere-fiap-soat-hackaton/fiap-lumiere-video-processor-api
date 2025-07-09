export interface S3EventRecord {
  eventVersion: string;
  eventSource: string;
  awsRegion: string;
  eventTime: string;
  eventName: string;
  s3: {
    s3SchemaVersion: string;
    configurationId?: string;
    bucket: {
      name: string;
      ownerIdentity?: {
        principalId: string;
      };
      arn: string;
    };
    object: {
      key: string;
      size: number;
      eTag: string;
      sequencer?: string;
    };
  };
}

export interface SQSRecord {
  messageId: string;
  receiptHandle: string;
  body: string; // JSON string containing S3 event
  attributes: {
    ApproximateReceiveCount: string;
    SentTimestamp: string;
    SenderId: string;
    ApproximateFirstReceiveTimestamp: string;
  };
  messageAttributes: Record<string, unknown>;
  md5OfBody: string;
  eventSource: string;
  eventSourceARN: string;
  awsRegion: string;
}

export interface S3EventMessage {
  Records: S3EventRecord[];
}

export interface MediaEventMessage {
  Records: SQSRecord[];
}
