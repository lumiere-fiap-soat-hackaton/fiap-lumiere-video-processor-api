export class GenerateSignedDownloadUrlCommand {
  constructor(
    public readonly resultFileKey: string,
    public readonly expiresIn: number,
  ) {}
}
