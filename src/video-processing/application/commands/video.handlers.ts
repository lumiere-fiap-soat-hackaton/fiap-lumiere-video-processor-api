import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MessagePublisher,
  MESSAGE_PUBLISHER,
} from '../../domain/messaging/message-publisher.interface';
import {
  VideoRepository,
  VIDEO_REPOSITORY,
} from '../../domain/repositories/video.repository';
import { VideoStatus } from '../../domain/entities/video.entity';
import {
  ProcessMediaFileCommand,
  UpdateVideoStatusCommand,
} from './video.commands';

@Injectable()
export class ProcessMediaFileHandler {
  constructor(
    @Inject(MESSAGE_PUBLISHER)
    private readonly messagePublisher: MessagePublisher,
    @Inject(VIDEO_REPOSITORY)
    private readonly videoRepository: VideoRepository,
    private readonly configService: ConfigService,
  ) {}

  async handle(command: ProcessMediaFileCommand): Promise<void> {
    const { userId, sourceFileKey, sourceFileName } = command;

    // 1. Criar registro do vídeo no banco
    const video = await this.videoRepository.create({
      userId,
      sourceFileKey,
      sourceFileName,
    });

    console.log(`-- Video created with ID: ${video.id}, User: ${userId}`);

    // 2. Enviar para fila de processamento
    const processQueueKey = this.configService.get<string>(
      'sqs.mediaProcessQueue',
    );
    await this.messagePublisher.publish(processQueueKey, video);

    console.log(
      `-- Video processing command sent to queue: ${processQueueKey}, Video ID: ${video.id}`,
    );
  }
}

@Injectable()
export class UpdateVideoStatusHandler {
  constructor(
    @Inject(VIDEO_REPOSITORY)
    private readonly videoRepository: VideoRepository,
  ) {}

  async handle(command: UpdateVideoStatusCommand): Promise<void> {
    const { videoId, status, resultFileKey, resultFileName } = command;

    const updateData = {
      status,
      ...(resultFileKey && { resultFileKey }),
      ...(resultFileName && { resultFileName }),
    };

    await this.videoRepository.update(videoId, updateData);
  }
}
