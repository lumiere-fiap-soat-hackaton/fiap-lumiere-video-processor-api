export class GenerateSignedUploadUrlCommand {
  constructor(
    public readonly files: Array<{ fileName: string; contentType: string }>,
    public readonly expiresIn: number,
  ) {}
}
