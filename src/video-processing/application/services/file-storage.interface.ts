export interface IFileStorageService {
  getUploadSignedUrl(params: {
    fileName: string;
    contentType: string;
    expiresIn: number;
  }): Promise<string>;

  getDownloadSignedUrl(params: {
    resultFileKey: string;
    expiresIn: number;
  }): Promise<string>;

  fileExists(resultFileKey: string): Promise<boolean>;
}

export const IFileStorageService = Symbol('IFileStorageService');
