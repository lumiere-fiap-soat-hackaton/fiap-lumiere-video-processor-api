export enum MediaResultMessageStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  NO_FRAMES_EXTRACTED = 'NO_FRAMES_EXTRACTED',
}

export interface MediaResultMessage {
  id: string;
  resultFileKey: string;
  status: MediaResultMessageStatus;
}
