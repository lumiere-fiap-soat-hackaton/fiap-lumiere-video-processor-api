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

export interface MediaEventMessage {
  Records: S3EventRecord[];
}
