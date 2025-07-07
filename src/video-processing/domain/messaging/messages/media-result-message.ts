export enum MediaResultMessageStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  NO_FRAMES_EXTRACTED = 'NO_FRAMES_EXTRACTED',
}

export interface MediaResultMessage {
  request_id: string;
  result_s3_path: string;
  status: MediaResultMessageStatus;
}
