export class FileAlreadyExistsException extends Error {
  constructor(fileName: string) {
    super(`File "${fileName}" already exists.`);
    this.name = 'FileExistsException';
  }
}
