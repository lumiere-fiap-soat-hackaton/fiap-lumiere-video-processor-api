import { pino } from 'pino';
import { Injectable, LoggerService, Scope } from '@nestjs/common';
import { pinoConfig } from '@app/configuration/configuration';

@Injectable({ scope: Scope.REQUEST })
export class Logger implements LoggerService {
  private readonly logger = pino(pinoConfig());
  private context = '';

  setContext(context: string) {
    this.context = context;
  }

  log(message: string) {
    this.logger.info(`[${this.context}] - ${message}`);
  }

  error(message: string, trace: string) {
    this.logger.error({ trace }, `[${this.context}] - ${message}`);
  }

  warn(message: string) {
    this.logger.warn(
      { context: this.context },
      `[${this.context}] - ${message}`,
    );
  }

  debug(message: string) {
    this.logger.debug(`[${this.context}] - ${message}`);
  }

  verbose(message: string) {
    this.logger.trace(
      { context: this.context },
      `[${this.context}] - ${message}`,
    );
  }
}
