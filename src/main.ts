import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';
import { RequestMethod, ValidationPipe, VersioningType } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.useLogger(app.get(Logger));
  app.useGlobalInterceptors(new LoggerErrorInterceptor());

  app.setGlobalPrefix('api', {
    exclude: [{ path: 'docs', method: RequestMethod.GET }],
  });

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('FIAP Lumiere - Video Processor API')
    .setDescription('API documentation for the Video Processor application')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = configService.get<number>('app.port');
  await app.listen(port);

  const logger = app.get(Logger);
  logger.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap().catch((error) => {
  console.error('Error during bootstrap:', error);
});
