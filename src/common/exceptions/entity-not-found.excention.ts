export class EntityNotFoundException extends Error {
  constructor(entityName: string, identifier: string | number) {
    super(`${entityName} with ID ${identifier} was not found.`);
    this.name = 'EntityNotFoundException';
  }
}
