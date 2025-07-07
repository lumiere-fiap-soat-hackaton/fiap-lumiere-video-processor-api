export class GenerateSignedDownloadUrlCommand {
  constructor(
    public readonly fileName: string,
    public readonly expiresIn: number,
  ) {}
}
