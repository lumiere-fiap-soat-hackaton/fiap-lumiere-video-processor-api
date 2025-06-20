import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration, pinoConfig } from './configuration';
import { LoggerModule } from 'nestjs-pino';
import { Logger } from '@app/common/services/logger';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    LoggerModule.forRoot({ pinoHttp: pinoConfig() }),
  ],
  providers: [Logger],
  exports: [Logger],
})
export class ConfigurationModule {}
