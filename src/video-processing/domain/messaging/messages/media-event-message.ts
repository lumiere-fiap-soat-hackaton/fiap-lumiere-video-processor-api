// Mensagem que vem do S3 (media_events_queue)
export interface MediaEventMessage {
  eventName: string; // ex: 's3:ObjectCreated:Put'
  bucketName: string;
  objectKey: string;
  objectSize: number;
  timestamp: string;
  etag: string;
}
