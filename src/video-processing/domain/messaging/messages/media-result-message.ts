// Mensagem que recebemos com resultado (media_result_queue)
export interface MediaResultMessage {
  videoId: string;
  action: string;
  status: 'success' | 'failed';
  result?: {
    processedUrl?: string;
    thumbnailUrl?: string;
    duration?: number;
    [key: string]: any;
  };
  error?: string;
  timestamp: string;
  correlationId: string;
}
