export interface IFileStorageService {
  getUploadSignedUrl(params: {
    fileName: string;
    contentType: string;
    expiresIn: number;
  }): Promise<string>;

  getDownloadSignedUrl(params: {
    fileName: string;
    expiresIn: number;
  }): Promise<string>;
}

export const IFileStorageService = Symbol('IFileStorageService');
