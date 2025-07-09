export interface SQSMessageAttributes {
  ApproximateReceiveCount: string;
  SentTimestamp: string;
  SenderId: string;
  ApproximateFirstReceiveTimestamp: string;
}

export interface SQSMessageUserIdentity {
  principalId: string;
}

export interface SQSMessageRequestParameters {
  sourceIPAddress: string;
}

export interface SQSMessageResponseElements {
  'x-amz-request-id': string;
  'x-amz-id-2': string;
}

export interface SQSMessageS3BucketOwnerIdentity {
  principalId: string;
}

export interface SQSMessageS3Bucket {
  name: string;
  ownerIdentity: SQSMessageS3BucketOwnerIdentity;
  arn: string;
}

export interface SQSMessageS3Object {
  key: string;
  size: number;
  eTag: string;
  sequencer: string;
}

export interface SQSMessageS3Details {
  s3SchemaVersion: string;
  configurationId: string;
  bucket: SQSMessageS3Bucket;
  object: SQSMessageS3Object;
}

export interface SQSMessageS3EventRecord {
  eventVersion: string;
  eventSource: string;
  awsRegion: string;
  eventTime: string;
  eventName: string;
  userIdentity: SQSMessageUserIdentity;
  requestParameters: SQSMessageRequestParameters;
  responseElements: SQSMessageResponseElements;
  s3: SQSMessageS3Details;
}

export interface SQSMessageBody {
  Records: SQSMessageS3EventRecord[];
}

export interface SQSMessage {
  Body: string; // JSON string containing SQSMessageBody
  MD5OfBody: string;
  MessageId: string;
  ReceiptHandle: string;
}

export interface ProcessedSQSMessage {
  id: string;
  body: SQSMessageBody;
  receiptHandle: string;
}
