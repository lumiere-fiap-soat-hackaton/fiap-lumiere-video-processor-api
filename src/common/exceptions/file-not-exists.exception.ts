export class FileNotExistsException extends Error {
  constructor(fileName: string) {
    super(`File "${fileName}" does not exist.`);
    this.name = 'FileNotExistsException';
  }
}
