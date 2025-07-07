export class FileData {
  constructor(
    public readonly fileName: string,
    public readonly contentType: string,
  ) {}
}

export class GetSignedUploadUrlQuery {
  constructor(
    public readonly files: FileData[],
    public readonly expiresIn: number,
  ) {}
}
