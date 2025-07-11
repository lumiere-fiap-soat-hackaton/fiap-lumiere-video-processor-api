import {
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Req,
  Logger,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiHeader } from '@nestjs/swagger';
import { QueryBus } from '@nestjs/cqrs';
import { Request } from 'express';
import { VideoResponseDto } from '../dtos/video-response.dto';
import { GetVideosByUserQuery } from '@app/video-processing/application/use-cases/get-videos-by-user/get-videos-by-user.query';
import { Video } from '@app/video-processing/domain/entities/video.entity';

@ApiTags('User Records')
@Controller('user-records')
export class UserRecordsController {
  private readonly logger = new Logger(UserRecordsController.name);

  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @ApiOperation({
    summary: 'Busca todos os vídeos do usuário',
    description:
      'Retorna todos os vídeos associados ao usuário identificado pelo header x-user-id',
  })
  @ApiHeader({
    name: 'x-user-id',
    description: 'ID do usuário',
    required: true,
    schema: {
      type: 'string',
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de vídeos do usuário',
    type: [VideoResponseDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Header x-user-id é obrigatório',
  })
  async getUserRecords(
    @Headers('x-user-id') userId: string,
    @Req() request: Request,
  ): Promise<Video[]> {
    // Debug logs
    this.logger.debug('=== DEBUG: getUserRecords Request ===');
    this.logger.debug(`Headers: ${JSON.stringify(request.headers, null, 2)}`);
    this.logger.debug(
      `Query params: ${JSON.stringify(request.query, null, 2)}`,
    );
    this.logger.debug(`Body: ${JSON.stringify(request.body, null, 2)}`);
    this.logger.debug(`Method: ${request.method}`);
    this.logger.debug(`URL: ${request.url}`);
    this.logger.debug(`User ID from x-user-id header: ${userId}`);
    this.logger.debug('=====================================');

    if (!userId) {
      this.logger.error('Header x-user-id não fornecido');
      throw new HttpException(
        'Header x-user-id é obrigatório',
        HttpStatus.BAD_REQUEST,
      );
    }

    const query = new GetVideosByUserQuery(userId);
    this.logger.debug(`Executando query para userId: ${userId}`);

    const result = await this.queryBus.execute<GetVideosByUserQuery, Video[]>(
      query,
    );
    this.logger.debug(
      `Query executada com sucesso. Encontrados ${result.length} vídeos`,
    );

    return result;
  }
}
