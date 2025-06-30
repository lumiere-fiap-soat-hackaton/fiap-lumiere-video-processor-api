export class GetSignedUploadUrlQuery {
  constructor(
    public readonly fileName: string,
    public readonly contentType: string,
    public readonly expiresIn: number,
  ) {}
}
