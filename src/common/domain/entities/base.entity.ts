export abstract class BaseEntity {
  constructor() {
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  id: number;
  createdAt?: Date;
  updatedAt?: Date;
}
