// Mensagem que enviamos para processamento (media_process_queue)
export interface MediaProcessMessage {
  videoId: string;
  action: 'process' | 'transcode' | 'thumbnail' | 'analyze';
  inputUrl: string;
  outputBucket: string;
  metadata?: {
    targetFormat?: string;
    quality?: string;
    [key: string]: any;
  };
  timestamp: string;
  correlationId: string;
}
