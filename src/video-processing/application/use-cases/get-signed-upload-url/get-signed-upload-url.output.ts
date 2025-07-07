export class SignedUploadFileUrl {
  constructor(
    public readonly fileName: string,
    public readonly signedUrl: string,
  ) {}
}

export class GetSignedUploadUrlOutput {
  constructor(public readonly signedUrls: SignedUploadFileUrl[]) {}
}
