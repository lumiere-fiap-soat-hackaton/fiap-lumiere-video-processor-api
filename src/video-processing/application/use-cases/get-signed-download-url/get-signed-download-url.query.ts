export class GetSignedDownloadUrlQuery {
  constructor(
    public readonly fileName: string,
    public readonly expiresIn: number,
  ) {}
}
